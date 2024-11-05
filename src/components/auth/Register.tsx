import React, { useEffect } from 'react';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import { getAuth, EmailAuthProvider, sendEmailVerification, UserCredential } from 'firebase/auth';

const Register = () => {
    useEffect(() => {
        const auth = getAuth();
        const uiConfig = {
            signInOptions: [
                {
                    provider: EmailAuthProvider.PROVIDER_ID,
                    requireDisplayName: true,
                }
            ],
            signInSuccessUrl: '/', // Redirect to the dashboard after sign-up
            callbacks: {
                signInSuccessWithAuthResult: (authResult: UserCredential) => {
                    const user = authResult.user;
                    if (user) {
                        sendEmailVerification(user)
                            .then(() => {
                                alert("Verification email sent. Please check your inbox.");
                            })
                            .catch((error) => {
                                console.error("Error sending email verification:", error);
                            });
                    }
                    return false; // Prevent automatic redirect
                }
            }
        };

        let ui = firebaseui.auth.AuthUI.getInstance();
        if (!ui) {
            ui = new firebaseui.auth.AuthUI(auth);
        }

        if (ui) {
            ui.start('#firebaseui-register-container', uiConfig);
        }

        return () => {
            if (ui) {
                ui.reset();
            }
        };
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Register</h1>
            <div id="firebaseui-register-container"></div>
        </div>
    );
};

export default Register;