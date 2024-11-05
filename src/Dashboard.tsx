import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, Timestamp, query, orderBy, where } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { getAuth, signOut } from "firebase/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

// Firebase configuration
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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

interface Receipt {
    id: string;
    image_url?: string;
    uploaded_at?: Timestamp;
}

const Dashboard = () => {
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isVerified, setIsVerified] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                if (user.emailVerified) {
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

    useEffect(() => {
        if (isVerified) {
            const fetchData = async () => {
                const user = auth.currentUser;
                const q = query(
                    collection(db, 'receipt_data'), 
                    where('user_id', '==', user?.uid),
                    orderBy('uploaded_at', 'desc')
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => {
                    const docData = doc.data() as Partial<Receipt>;
                    return {
                        id: doc.id,
                        ...docData
                    } as Receipt;
                });
                
                setReceipts(data);
            };

            fetchData();
        }
    }, [isVerified]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Error signing out: ", error);
            alert("Failed to log out. Please try again.");
        }
    };

    if (!isVerified) {
        return <div>Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white font-medium px-4 py-2 rounded-md hover:bg-red-500 transition-all inline-flex items-center"
                >
                    <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
                    Logout
                </button>
                <h1 className="text-3xl font-semibold font-ubuntu text-center flex-grow">Receipts</h1>
                <Link
                    className="bg-blue-600 text-white font-medium px-4 py-2 rounded-md hover:bg-blue-500 transition-all inline-flex items-center"
                    to={'/upload'}
                >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    New
                </Link>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-center">
                {receipts.map(receipt => (
                    <li
                        key={receipt.id}
                        className="bg-white border rounded-lg p-4 w-full max-w-xs hover:bg-gray-100 transition-colors"
                    >
                        <Link to={`/receipts/${receipt.id}`} className="block">
                            {receipt.image_url && (
                                <LazyLoadImage
                                    src={receipt.image_url}
                                    alt={`Receipt ${receipt.id}`}
                                    effect="blur"
                                    className="w-full h-48 object-cover mb-4 rounded"
                                    placeholderSrc="path_to_loader_image"
                                />
                            )}
                            <p className="text-lg font-medium text-center">Receipt {receipt.id}</p>
                            {receipt.uploaded_at && (
                                <p className="text-center text-sm text-gray-400 mt-2">
                                    {receipt.uploaded_at.toDate().toLocaleDateString()}
                                </p>
                            )}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Dashboard;