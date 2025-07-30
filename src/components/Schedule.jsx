// src/components/Schedule.jsx

import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
} from 'firebase/firestore';
import './Schedule.css';

function Schedule({ refreshKey }) {
    const [scheduleData, setScheduleData] = useState({});
    const [days, setDays] = useState([]);
    const [maxWorkersCount, setMaxWorkersCount] = useState(0);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchedule = async () => {
            setLoading(true);
            setError(null);

            try {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    setError('Not authenticated.');
                    setLoading(false);
                    return;
                }

                const authSnap = await getDoc(doc(db, 'auth', currentUser.uid));
                if (!authSnap.exists()) {
                    setError('Auth document not found.');
                    setLoading(false);
                    return;
                }

                const { centerID } = authSnap.data();

                const usersQuery = query(
                    collection(db, 'users'),
                    where('centerID', '==', centerID)
                );
                const usersSnapshot = await getDocs(usersQuery);

                const scheduleMap = {};
                const allDaysSet = new Set();

                for (const userDoc of usersSnapshot.docs) {
                    const userID = userDoc.id;
                    const userData = userDoc.data();

                    if (userData.role !== 'worker') continue;

                    const workerName = userData.name || 'Unnamed';
                    const lastSubmission = userData.lastSubmission?.toMillis?.() || 0;

                    const availabilitySnapshot = await getDocs(
                        collection(db, 'users', userID, 'availability')
                    );

                    availabilitySnapshot.forEach((availDoc) => {
                        const day = availDoc.id;
                        const data = availDoc.data();

                        allDaysSet.add(day);
                        if (!scheduleMap[day]) scheduleMap[day] = [];

                        scheduleMap[day].push({
                            name: workerName,
                            priority: data.priority ?? 999,
                            lastSubmission: lastSubmission,
                        });
                    });
                }

                for (const day in scheduleMap) {
                    scheduleMap[day].sort((a, b) => {
                        if (a.priority !== b.priority) return a.priority - b.priority;
                        return a.lastSubmission - b.lastSubmission; // older first
                    });
                }

                setDays(Array.from(allDaysSet));
                setScheduleData(scheduleMap);

                const maxCount = Math.max(
                    0,
                    ...Object.values(scheduleMap).map((workers) => workers.length)
                );
                setMaxWorkersCount(maxCount);
            } catch (err) {
                console.error('Schedule error:', err);
                setError('Failed to load schedule.');
            }

            setLoading(false);
        };

        fetchSchedule();
    }, [refreshKey]); // Re-fetch when refreshKey changes

    return (
        <div className="schedule">
            <h2>Worker Schedule</h2>
            {loading && <div className="spinner" />}
            {error && <p className="error">{error}</p>}
            {!loading && !error && (
                <table>
                    <thead>
                        <tr>
                            {days.map((day) => (
                                <th key={day}>{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {maxWorkersCount > 0 ? (
                            Array.from({ length: maxWorkersCount }).map((_, rowIndex) => (
                                <tr key={rowIndex}>
                                    {days.map((day) => {
                                        const workers = scheduleData[day] || [];
                                        const worker = workers[rowIndex];
                                        return (
                                            <td key={day + rowIndex}>
                                                {worker ? `${worker.name} (${worker.priority})` : ''}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={days.length}>No availability data submitted yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default Schedule;
