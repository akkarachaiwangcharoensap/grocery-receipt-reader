import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import 'tailwindcss/tailwind.css';
import SpreadSheet from './components/SpreadSheet';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFileExport, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { CSVLink } from 'react-csv';

const db = getFirestore();

interface ReceiptItem
{
    name: string;
    value: number;
}

interface ReceiptData
{
    items: ReceiptItem[];
    image_url?: string;
    uploaded_at?: Timestamp;
}

interface SpreadsheetRowData
{
    name: string;
    value: number;
}

const Receipt: React.FC = () =>
{
    const { id } = useParams<{ id: string }>();
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    const [spreadsheetData, setSpreadsheetData] = useState<Array<SpreadsheetRowData> | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() =>
    {
        const fetchData = async () =>
        {
            if (id)
            {
                const docRef = doc(db, 'receipt_data', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists())
                {
                    let receiptData = docSnap.data() as ReceiptData;
                    let spreadsheetData = flattenReceiptData(receiptData);
                    setReceipt(receiptData);
                    setSpreadsheetData(spreadsheetData);
                }
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const flattenReceiptData = (receiptData: ReceiptData): SpreadsheetRowData[] =>
    {
        return receiptData.items.map(item => ({
            name: item.name,
            value: item.value
        }));
    };

    const handleDataChange = (data: SpreadsheetRowData[]) =>
    {
        setSpreadsheetData(data);
    };

    const handleSave = async () =>
    {
        if (id && spreadsheetData)
        {
            const docRef = doc(db, 'receipt_data', id);
            try
            {
                await setDoc(docRef, { items: spreadsheetData }, { merge: true });
                alert("Data updated successfully!");
            } catch (error)
            {
                console.error("Error saving document: ", error);
                alert("Error saving data!");
            }
        } else
        {
            alert("No ID provided. Cannot save the document.");
        }
    };

    const handleDelete = async () =>
    {
        if (id)
        {
            const docRef = doc(db, 'receipt_data', id);
            try
            {
                await deleteDoc(docRef);
                alert("Document deleted successfully!");
                navigate('/');
            } catch (error)
            {
                console.error("Error deleting document: ", error);
                alert("Error deleting document!");
            }
        } else
        {
            alert("No ID provided. Cannot delete the document.");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="container max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-4 ml-32">
                <button
                    onClick={() => navigate('/')}
                    className="bg-gray-600 text-white font-medium px-4 py-2 rounded-md hover:bg-gray-500 transition-all inline-flex items-center"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                    Back
                </button>
                <h1 className="text-3xl font-semibold font-ubuntu text-center flex-grow">
                    {`${id}`}
                    <small className='pl-2 text-gray-500'>({receipt?.uploaded_at?.toDate().toLocaleDateString()})</small>
                </h1>

                <div className="space-x-2 mr-8">
                    <button
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-500 inline-flex items-center"
                        onClick={handleDelete}
                    >
                        <FontAwesomeIcon icon={faTrash} className="mr-2 " />
                        Delete
                    </button>
                </div>
            </div>
            <div className="flex">
                {receipt?.image_url && (
                    <div className="w-1/2 mx-auto">
                        <LazyLoadImage
                            src={receipt.image_url}
                            alt={`Receipt ${id}`}
                            effect="blur"
                            className="w-3/4 h-auto object-cover rounded ml-auto pr-4"
                        />
                    </div>
                )}
                <div className="w-1/2 text-left pl-4">
                    <SpreadSheet data={spreadsheetData} onDataChange={handleDataChange} />

                    <div className="space-x-2 float-right mr-8 mt-2">
                        <CSVLink
                            data={spreadsheetData || []}
                            headers={[
                                { label: "Name", key: "name" },
                                { label: "Value", key: "value" },
                            ]}
                            filename={`receipt_${Date.now()}.csv`}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 inline-flex items-center"
                        >
                            <FontAwesomeIcon icon={faFileExport} className="mr-2" />
                            Export to CSV
                        </CSVLink>
                        <button
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 inline-flex items-center"
                            onClick={handleSave}
                        >
                            <FontAwesomeIcon icon={faSave} className="mr-2" />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Receipt;