import React, { useEffect, useState } from 'react';
import { getAuth, EmailAuthProvider, sendPasswordResetEmail, UserCredential } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';

const Login = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
            setIsLoggedIn(true);
            navigate('/'); // Redirect to the dashboard if the user is logged in
        } else {
            const uiConfig = {
                signInOptions: [
                    {
                        provider: EmailAuthProvider.PROVIDER_ID,
                        requireDisplayName: false,
                    }
                ],
                callbacks: {
                    signInSuccessWithAuthResult: (authResult: UserCredential) => {
                        const user = authResult.user;
                        if (user) {
                            if (user.emailVerified) {
                                navigate('/'); // Redirect to the dashboard if the user is verified
                            } else {
                                alert("Please verify your email before accessing the dashboard.");
                            }
                        }
                        return false; // Do not redirect automatically
                    }
                },
                signInSuccessUrl: '/', // Redirect URL after successful login
                tosUrl: '', // Terms of Service URL
                privacyPolicyUrl: '', // Privacy Policy URL
            };

            let ui = firebaseui.auth.AuthUI.getInstance();
            if (!ui) {
                ui = new firebaseui.auth.AuthUI(auth);
            }

            ui.start('#firebaseui-auth-container', uiConfig);
        }
    }, [navigate]);

    const handlePasswordReset = () => {
        const email = prompt("Please enter your email address:");
        if (email) {
            const auth = getAuth();
            sendPasswordResetEmail(auth, email)
                .then(() => {
                    alert('Password reset email sent!');
                })
                .catch(error => {
                    alert(error.message);
                });
        }
    };

    if (isLoggedIn) {
        return null; // Don't render the login form if the user is already logged in
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Sign In</h1>
            <div id="firebaseui-auth-container"></div>
            <p className="text-center mt-4">
                Don't have an account? <Link to="/register" className="text-blue-500 hover:underline">Register here</Link>.
            </p>
            <p className="text-center mt-4">
                Forgot your password? <button onClick={handlePasswordReset} className="text-blue-500 hover:underline">Reset it here</button>.
            </p>
        </div>
    );
};

export default Login;