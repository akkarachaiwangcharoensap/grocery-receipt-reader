import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

// Firebase configuration using .env variables
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
initializeApp(firebaseConfig);

const db = getFirestore();
const storage = getStorage();
const auth = getAuth();

const ImageUpload: React.FC = () => {
    const [uploading, setUploading] = useState<boolean>(false);
    const [dragOver, setDragOver] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploaded, setUploaded] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [isVerified, setIsVerified] = useState<boolean>(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                if (user.emailVerified) {
                    setUser(user);
                    setIsVerified(true);
                } else {
                    alert("Please verify your email before accessing the dashboard.");
                    navigate('/login');
                }
            } else {
                navigate('/login');
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleImageChange = async (file: File): Promise<void> => {
        if (!user || !isVerified) {
            alert('You must be logged in and have a verified email to upload files.');
            return;
        }

        setUploading(true);

        try {
            const uniqueFileName = `${uuidv4()}`;
            const storageRef = ref(storage, `images/${user.uid}/${uniqueFileName}`);

            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const timestamp = Timestamp.now();

            await addDoc(collection(db, 'uploads'), {
                url: downloadURL,
                uploaded_at: timestamp,
                user_id: user.uid,
            });

            setUploading(false);
            setUploaded(true);
        } catch (error) {
            setUploading(false);
            if (error instanceof Error) {
                if (error.message.includes('permission')) {
                    alert('You do not have permission to upload files. Please contact support if you believe this is a mistake.');
                } else {
                    alert('An error occurred during the upload. Please try again later.');
                }
            } else {
                alert('An unexpected error occurred. Please try again later.');
            }
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleUploadClick = (): void => {
        if (file) {
            handleImageChange(file);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        setDragOver(false);
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
            const reader = new FileReader();
            reader.onload = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(droppedFile);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (): void => {
        setDragOver(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {!user || !isVerified ? (
                <div id="firebaseui-auth-container"></div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-8">
                        <button
                            onClick={() => navigate('/')}
                            className="bg-gray-600 text-white font-medium px-4 py-2 rounded-md hover:bg-gray-500 transition-all inline-flex items-center"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                            Back
                        </button>
                        <h1 className="text-3xl font-semibold font-ubuntu text-center flex-grow mr-16 pr-6">Receipt Upload</h1>
                    </div>
                    <main className="container mx-auto p-4 pt-6">
                        {uploading ? (
                            <p className="text-center">Uploading...</p>
                        ) : (
                            <div className="text-center">
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    className={`bg-white text-gray-500 font-semibold text-base rounded max-w-lg h-64 flex flex-col items-center justify-center cursor-pointer border-2 ${dragOver ? 'border-blue-500' : 'border-gray-300 border-dashed'
                                        } mx-auto font-[sans-serif]`}
                                >
                                    {preview ? (
                                        <div className="flex flex-col items-center">
                                            <img src={preview} alt="Preview" className="h-52 w-auto mb-2" />
                                            <p className="text-xs font-medium text-gray-400">{file?.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-11 mb-2 fill-gray-500" viewBox="0 0 32 32">
                                                <path
                                                    d="M23.75 11.044a7.99 7.99 0 0 0-15.5-.009A8 8 0 0 0 9 27h3a1 1 0 0 0 0-2H9a6 6 0 0 1-.035-12 1.038 1.038 0 0 0 1.1-.854 5.991 5.991 0 0 1 11.862 0A1.08 1.08 0 0 0 23 13a6 6 0 0 1 0 12h-3a1 1 0 0 0 0 2h3a8 8 0 0 0 .75-15.956z"
                                                    data-original="#000000" />
                                                <path
                                                    d="M20.293 19.707a1 1 0 0 0 1.414-1.414l-5-5a1 1 0 0 0-1.414 0l-5 5a1 1 0 0 0 1.414 1.414L15 16.414V29a1 1 0 0 0 2 0V16.414z"
                                                    data-original="#000000" />
                                            </svg>
                                            Upload file
                                        </>
                                    )}
                                </div>
                                <input type="file" onChange={handleInputChange} className="hidden" />
                                <button
                                    onClick={handleUploadClick}
                                    disabled={!file}
                                    className="mt-4 bg-blue-600 cursor-pointer text-white font-medium px-4 py-2 rounded-md hover:bg-blue-500 transition-all inline-flex items-center"
                                >
                                    Upload
                                </button>
                                {uploaded && <p className="mt-2 text-green-500">File uploaded successfully.</p>}
                            </div>
                        )}
                    </main>
                </>
            )}
        </div>
    );
};

export default ImageUpload;