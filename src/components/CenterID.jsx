import React, { useState } from 'react';
import { db, doc, getDoc } from '../../firebase'; // Make sure this path is correct

const CenterID = ({ onSubmit }) => {
    const [centerID, setCenterID] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = centerID.trim();

        if (!trimmed) {
            setError('Please enter a valid Center ID.');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const centerDocRef = doc(db, 'centers', trimmed);
            const centerSnap = await getDoc(centerDocRef);

            if (centerSnap.exists()) {
                onSubmit(trimmed);
            } else {
                setError(`Center ID "${trimmed}" does not exist.`);
            }
        } catch (err) {
            console.error('Error checking center ID:', err);
            setError('Error checking center ID. Please try again.');
        }

        setLoading(false);
    };

    return (
        <div className="center-id">
            <h1>Enter Center ID</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={centerID}
                    onChange={(e) => setCenterID(e.target.value)}
                    placeholder="Enter Center ID"
                    disabled={loading}
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Checking...' : 'Next'}
                </button>
            </form>
            {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
        </div>
    );
};

export default CenterID;
