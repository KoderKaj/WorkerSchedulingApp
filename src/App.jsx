// src/App.jsx

import React, { useState, useEffect } from 'react';
import CenterID from './components/CenterID';
import Login from './components/Login';
import Schedule from './components/Schedule';
import WorkerPreferences from './components/WorkerPreferences';

import { auth, db, doc, getDoc, deleteDoc, collection, getDocs, writeBatch } from '../firebase';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';

import './App.css';

function App() {
    const [centerID, setCenterID] = useState(null);
    const [user, setUser] = useState(null); // full user data from /auth
    const [days, setDays] = useState(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    const [authReady, setAuthReady] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // used to force schedule refresh

    // Handle Firebase Auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                try {
                    await signInAnonymously(auth);
                    console.log('Signed in anonymously');
                } catch (err) {
                    console.error('Anonymous sign-in error:', err);
                }
            } else {
                console.log('Authenticated as:', firebaseUser.uid);
                try {
                    const authRef = doc(db, 'auth', firebaseUser.uid);
                    const authSnap = await getDoc(authRef);
                    if (authSnap.exists()) {
                        const authData = authSnap.data();
                        setUser({
                            authUID: firebaseUser.uid,
                            uid: authData.uid,
                            centerID: authData.centerID,
                            role: authData.role,
                            name: authData.name || '',
                        });
                        setCenterID(authData.centerID);
                    } else {
                        setUser(null);
                    }
                } catch (err) {
                    console.error("Error fetching auth doc:", err);
                }

                setAuthReady(true);
            }
        });

        return () => unsubscribe();
    }, []);

    // Fetch center configuration (e.g., working days)
    useEffect(() => {
        const fetchDays = async () => {
            if (!centerID) return;

            try {
                const centerDocRef = doc(db, 'centers', centerID);
                const docSnap = await getDoc(centerDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.daysOptions) {
                        setDays(data.daysOptions);
                    }
                }
            } catch (err) {
                console.error("Error fetching center config:", err);
            }
        };

        fetchDays();
    }, [centerID]);

    const handleCenterIDSubmit = (enteredCenterID) => {
        setCenterID(enteredCenterID);
    };

    const handleLogin = (loggedInUser) => {
        setUser(loggedInUser);
    };

    const handleLogout = async () => {
        try {
            if (auth.currentUser) {
                const authUID = auth.currentUser.uid;
                await deleteDoc(doc(db, 'auth', authUID));
                await signOut(auth);
            }
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            setUser(null);
            setCenterID(null);
        }
    };

    const handleSavePreferences = async (centerID, workerUID, preferences) => {
        if (!centerID || !workerUID || !preferences) {
            console.error('Missing pref');
            return;
        }

        try {
            //Moved saving to worker preferences

            /*const batch = writeBatch(db);
            const availabilityRef = collection(db, `users/${workerUID}/availability`);

            // Delete existing availability docs
            const existingDocs = await getDocs(availabilityRef);
            existingDocs.forEach(docSnap => {
                batch.delete(docSnap.ref);
            });

            // Set new availability docs
            Object.entries(preferences).forEach(([day, priority]) => {
                const docRef = doc(db, `users/${workerUID}/availability/${day}`);
                batch.set(docRef, { priority });
            });

            await batch.commit();
            console.log('Preferences saved');*/

            // Trigger Schedule to re-fetch
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    };

    if (!authReady) {
        return <p>Initializing authentication...</p>;
    }

    let content;
    if (!centerID) {
        content = <CenterID onSubmit={handleCenterIDSubmit} />;
    } else if (!user) {
        content = <Login centerID={centerID} onLogin={handleLogin} />;
    } else {
        content = (
            <div>
                <h2>Welcome {user.name || 'User'}</h2>
                <button onClick={handleLogout}>Logout</button>
                <Schedule centerID={centerID} refreshKey={refreshKey} />
                {user.role === 'worker' && (
                    <WorkerPreferences
                        days={days}
                        centerID={centerID}
                        workerKey={user.uid}
                        onSave={handleSavePreferences}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="App">
            <h1>Worker Scheduling System</h1>
            {content}
        </div>
    );
}

export default App;
