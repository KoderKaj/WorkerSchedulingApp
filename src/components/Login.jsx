// src/components/Login.jsx

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import './Login.css';

function Login({ centerID, onLogin }) {
    const [key, setKey] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [authReady, setAuthReady] = useState(false);

    // Wait for auth to initialize
    useEffect(() => {
        const checkAuthReady = setInterval(() => {
            if (auth.currentUser) {
                console.log('Auth ready:', auth.currentUser.uid);
                setAuthReady(true);
                clearInterval(checkAuthReady);
            }
        }, 100);
        return () => clearInterval(checkAuthReady);
    }, []);

    useEffect(() => {
        setError(null);
    }, [centerID]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!key) return setError('Please enter your key.');
        setLoading(true);

        try {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) {
                setLoading(false);
                return setError('Not authenticated.');
            }

            console.log('Authenticated as:', firebaseUser.uid);

            const keyDocRef = doc(db, 'keys', key);
            const keySnap = await getDoc(keyDocRef);

            if (!keySnap.exists()) {
                setLoading(false);
                return setError('Invalid key.');
            }

            const keyData = keySnap.data();
            console.log('Key data:', keyData);

            if (keyData.centerID !== centerID) {
                setLoading(false);
                return setError('This key does not belong to the selected center.');
            }

            const uid = keyData.uid;
            const role = keyData.role || 'worker';

            // Step 1: Write a temporary auth document to pass Firestore security rules
            const authDocRef = doc(db, 'auth', firebaseUser.uid);
            await setDoc(
                authDocRef,
                {
                    uid,
                    centerID,
                    role,
                    name: '', // placeholder for now
                },
                { merge: true }
            );

            console.log('Temporary auth doc written. Now attempting to read /users/', uid);

            // Step 2: Now it's safe to fetch the user document
            const userDocRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userDocRef);

            if (!userSnap.exists()) {
                setLoading(false);
                return setError('User not found.');
            }

            const userData = userSnap.data();
            console.log('User data:', userData);

            // Step 3: Update auth doc with user's name
            await setDoc(
                authDocRef,
                {
                    name: userData.name || '',
                },
                { merge: true }
            );

            console.log('Auth document updated successfully.');

            // Step 4: Inform parent component
            onLogin({
                uid,
                centerID,
                role,
                name: userData.name,
            });

        } catch (err) {
            console.error('Login error:', err);
            setError(`Login failed: ${err.message}`);
        }

        setLoading(false);
    };

    return (
        <div className="login">
            <h2>Login for Center: {centerID}</h2>
            {!authReady && <p>Waiting for authentication...</p>}
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Enter your worker key"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    disabled={loading || !authReady}
                />
                <button type="submit" disabled={loading || !authReady}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}

export default Login;
