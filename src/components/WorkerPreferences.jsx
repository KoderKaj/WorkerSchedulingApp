import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, doc, writeBatch } from '../../firebase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './WorkerPreferences.css';

function WorkerPreferences({ days, centerID, workerKey, onSave }) {
    const [availableDays, setAvailableDays] = useState([]);
    const [selectedDays, setSelectedDays] = useState([]);
    const [savingMessage, setSavingMessage] = useState('');

    useEffect(() => {
        async function fetchAvailability() {
            try {
                if (!workerKey) return;

                const availabilityRef = collection(db, `users/${workerKey}/availability`);
                const snapshot = await getDocs(availabilityRef);

                const availabilityData = {};
                snapshot.forEach(doc => {
                    availabilityData[doc.id] = doc.data();
                });

                const selected = Object.entries(availabilityData)
                    .sort((a, b) => a[1].priority - b[1].priority) // lowercase 'priority'
                    .map(([day]) => day);

                const remaining = days.filter(day => !selected.includes(day));

                setSelectedDays(selected);
                setAvailableDays(remaining);
            } catch (err) {
                console.error('Error loading availability:', err);
                setAvailableDays(days);
                setSelectedDays([]);
            }
        }

        fetchAvailability();
    }, [workerKey, days]);

    const handleDragEnd = (result) => {
        const { source, destination } = result;
        if (!destination) return;

        const sameList = source.droppableId === destination.droppableId;

        if (sameList) {
            const listCopy =
                source.droppableId === 'available' ? [...availableDays] : [...selectedDays];

            const [movedItem] = listCopy.splice(source.index, 1);
            listCopy.splice(destination.index, 0, movedItem);

            if (source.droppableId === 'available') {
                setAvailableDays(listCopy);
            } else {
                setSelectedDays(listCopy);
            }
        } else {
            // Moving across lists
            const sourceList =
                source.droppableId === 'available' ? [...availableDays] : [...selectedDays];
            const destList =
                destination.droppableId === 'available' ? [...availableDays] : [...selectedDays];

            const [movedItem] = sourceList.splice(source.index, 1);
            destList.splice(destination.index, 0, movedItem);

            if (source.droppableId === 'available') {
                setAvailableDays(sourceList);
                setSelectedDays(destList);
            } else {
                setSelectedDays(sourceList);
                setAvailableDays(destList);
            }
        }
    };

    const handleSave = async () => {
        try {
            const batch = writeBatch(db);
            const availabilityRef = collection(db, `users/${workerKey}/availability`);

            const existingDocs = await getDocs(availabilityRef);
            existingDocs.forEach(docSnap => {
                batch.delete(docSnap.ref);
            });

            selectedDays.forEach((day, index) => {
                const docRef = doc(db, `users/${workerKey}/availability/${day}`);
                batch.set(docRef, { priority: index + 1 }); // lowercase key
            });

            const userRef = doc(db, `users/${workerKey}`);
            batch.update(userRef, {
                lastSubmission: new Date()
            });

            await batch.commit();

            setSavingMessage('Preferences saved!');
            if (onSave && centerID && workerKey) {
                onSave(centerID, workerKey, selectedDays);
            }

            setTimeout(() => setSavingMessage(''), 2000);
        } catch (err) {
            console.error('Error saving preferences:', err);
            setSavingMessage('Failed to save preferences.');
            setTimeout(() => setSavingMessage(''), 3000);
        }
    };

    return (
        <div className="worker-preferences">
            <h2>Drag Days to Set Your Availability (Top = Highest Priority)</h2>
            <div className="dnd-container">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="available">
                        {(provided) => (
                            <div
                                className="day-list available"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                <h3>Available Days</h3>
                                {availableDays.map((day, index) => (
                                    <Draggable key={day} draggableId={day} index={index}>
                                        {(provided) => (
                                            <div
                                                className="day-item"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                            >
                                                {day}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>

                    <Droppable droppableId="selected">
                        {(provided) => (
                            <div
                                className="day-list selected"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                <h3>Your Chosen Days</h3>
                                {selectedDays.map((day, index) => (
                                    <Draggable key={day} draggableId={day} index={index}>
                                        {(provided) => (
                                            <div
                                                className="day-item"
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                            >
                                                {day}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            <button onClick={handleSave}>Save Preferences</button>
            {savingMessage && <p className="success-message">{savingMessage}</p>}
        </div>
    );
}

export default WorkerPreferences;
