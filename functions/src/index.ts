/* eslint-disable max-len */
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import {v4 as uuidv4} from "uuid";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

interface UploadData
{
    url: string;
    user_id: string;
}

/**
 * Represents the data structure for a receipt.
 */
interface ReceiptData
{
    items: { name: string; price: number }[];
    taxes: { name: string; price: number }[];
    total: number;
}

/**
 * Represents a flattened data structure with a name and value pair.
 */
interface FlattenedData
{
    name: string;
    value: number;
}

exports.sendImageToGPT4o = functions.firestore
    .document("uploads/{uploadId}")
    .onCreate(async (snap, context) => {
        const data = snap.data() as UploadData;
        const imageURL = data.url;
        const userId = data.user_id;

        // Fetch the image from the URL
        const imageResponse = await axios.get(imageURL, {responseType: "arraybuffer"});
        const imageBuffer = Buffer.from(imageResponse.data, "binary");

        // Check the size of the image
        const imageSizeInMB = imageBuffer.length / (1024 * 1024);

        // If the image is greater than 2 MB, send a JSON error response
        if (imageSizeInMB > 2.3) {
            throw new Error("Image size exceeds 2 MB");
        }

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-2024-08-06",
                messages: [
                    {
                        role: "system",
                        content: [
                            {
                                "text": "Extract the receipt and return the following JSON format:\nDO NOT include the dollar sign ($)\nCapitalize all names.\n\n{\n    \"items\": [\n        {\n            \"name\": product_name,\n            \"price\": product_price,\n        },\n        ...\n    ],\n    \"taxes\": [\n        {\n            \"name\": tax_name,\n            \"price\": tax_price,\n        },\n        \"total\": total\n    }\n}",
                                "type": "text",
                            },
                        ],
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageURL,
                                },
                            },
                        ],
                    },
                ],
                temperature: 1,
                max_tokens: 1000,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
                response_format: {
                    type: "json_object",
                },
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "OpenAI-Organization": process.env.OPENAI_ORGANIZATION_ID,
                    "OpenAI-Project": process.env.OPENAI_PROJECT_ID,
                },
            }
        );

        const rawResponse = response.data;
        // Log the raw response to Firestore for debugging
        await admin.firestore().collection("receipt_requests").add(rawResponse);

        const receiptDataString = rawResponse.choices[0].message.content;
        let receiptData: ReceiptData;

        try {
            receiptData = JSON.parse(receiptDataString);
        } catch (error) {
            console.error("Error parsing receipt data:", error);
            throw new Error("Invalid JSON format");
        }

        // Validate receiptData before adding it to Firestore
        if (typeof receiptData === "object" && receiptData !== null) {
            const flattenedData = flattenReceiptData(receiptData);

            const dataToStore = {
                image_url: imageURL,
                items: flattenedData,
                user_id: userId,
                uploaded_at: admin.firestore.Timestamp.now(),
            };

            await admin.firestore().collection("receipt_data").add(dataToStore);
        } else {
            throw new Error("Invalid receipt data format");
        }

        // Insert a new entry to "user_requests" with action: "upload_receipt"
        await admin.firestore().collection("user_requests").add({
            user_id: userId,
            action: "upload_receipt",
            created_at: admin.firestore.Timestamp.now(),
        });
    });

exports.upload_image = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send({message: "Method not allowed"});
        return;
    }

    try {
        const {image, userId} = req.body;

        if (!image || !userId) {
            res.status(400).send({message: "Invalid request. Image and user ID are required."});
            return;
        }

        // Decode base64 image
        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");

        // Validate the image size
        const imageSizeInMB = buffer.length / (1024 * 1024);
        if (imageSizeInMB > 2) {
            res.status(400).send({message: "Image size exceeds 2 MB"});
            return;
        }

        // Get the first and last days of the current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Check if the user has reached their monthly upload limit
        const userRequestsSnapshot = await admin.firestore()
            .collection("user_requests")
            .where("userId", "==", userId)
            .where("action", "==", "upload_receipt")
            .where("created_at", ">=", admin.firestore.Timestamp.fromDate(firstDayOfMonth))
            .where("created_at", "<=", admin.firestore.Timestamp.fromDate(lastDayOfMonth))
            .get();

        if (userRequestsSnapshot && userRequestsSnapshot.size >= 10) {
            res.status(400).send({message: "Monthly upload limit exceeded. You can only upload 10 receipts per month."});
            return;
        }

        // Upload the image to Firebase Storage
        const storageRef = admin.storage().bucket().file(`uploads/${userId}/${uuidv4()}`);
        await storageRef.save(buffer);
        const downloadURL = await storageRef.getSignedUrl({action: "read", expires: "03-09-2491"});

        // Forward the image to OpenAI
        const openAIResponse = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-2024-08-06",
                messages: [
                    {
                        role: "system",
                        content: "Extract the receipt and return the following JSON format:\nDO NOT include the dollar sign ($)\n{\n    \"items\": [\n        {\n            \"name\": product_name,\n            \"price\": product_price,\n        },\n        ...\n    ],\n    \"taxes\": [\n        {\n            \"name\": tax_name,\n            \"price\": tax_price,\n        },\n        \"total\": total\n    }\n}",
                    },
                    {
                        role: "user",
                        content: `data:image/jpeg;base64,${image}`,
                    },
                ],
                temperature: 1,
                max_tokens: 1000,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                    "OpenAI-Organization": process.env.OPENAI_ORGANIZATION_ID,
                    "OpenAI-Project": process.env.OPENAI_PROJECT_ID,
                },
            }
        );

        const receiptDataString = openAIResponse.data.choices[0].message.content;

        // Validate receiptData before adding it to Firestore
        let receiptData;
        try {
            receiptData = JSON.parse(receiptDataString);
        } catch (error) {
            console.error("Error parsing receipt data:", error);
            res.status(400).send({message: "Invalid receipt data format"});
            return;
        }

        if (typeof receiptData !== "object" || receiptData === null) {
            res.status(400).send({message: "Invalid receipt data structure"});
            return;
        }

        // Flatten and store the receipt data in receipt_data collection
        const flattenedData = flattenReceiptData(receiptData);

        const dataToStore = {
            image_url: downloadURL[0],
            items: flattenedData,
            userId,
            uploaded_at: admin.firestore.Timestamp.now(),
        };

        await admin.firestore().collection("receipt_data").add(dataToStore);

        // Insert a new entry to "user_requests" with action: "upload_receipt"
        await admin.firestore().collection("user_requests").add({
            userId,
            action: "upload_receipt",
            created_at: admin.firestore.Timestamp.now(),
        });

        res.status(200).send({message: "Upload successful", receiptData});
        return;
    } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).send({message: `An error occurred during the upload: ${error}`});
        return;
    }
});

/**
 * Flattens the receipt data by combining items, taxes, and total into a single array of name-value pairs.
 *
 * @param {ReceiptData} receiptData - The receipt data to flatten, which includes items, taxes, and total.
 * @return {FlattenedData[]} An array of flattened data, where each item represents a name-value pair.
 */
function flattenReceiptData(receiptData: ReceiptData): FlattenedData[] {
    const result: FlattenedData[] = [];

    // Flatten the items array
    receiptData.items.forEach((item) => {
        result.push({name: item.name, value: item.price});
    });

    // Flatten the taxes array
    receiptData.taxes.forEach((tax) => {
        result.push({name: tax.name, value: tax.price});
    });

    // Add the total
    result.push({name: "TOTAL", value: receiptData.total});

    return result;
}

