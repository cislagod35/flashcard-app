import React, { useState, useEffect, useRef } from 'react';
import { Plus, Book, Trash2, Edit2, Eye, ChevronLeft, ChevronRight, Save, X, Download, Upload, BarChart3, Clock, TrendingUp, Brain } from 'lucide-react';

export default function FlashcardApp() {
    const [topics, setTopics] = useState({});
    const [currentTopic, setCurrentTopic] = useState('');
    const [newTopicName, setNewTopicName] = useState('');
    const [showAddTopic, setShowAddTopic] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);
    const [studyMode, setStudyMode] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [bulkText, setBulkText] = useState('');
    const [addMode, setAddMode] = useState('single');
    const [view, setView] = useState('topics'); // 'topics' or 'stats'
    const [studyStats, setStudyStats] = useState({});
    const [studyQueue, setStudyQueue] = useState([]);
    const [lastStudyReminder, setLastStudyReminder] = useState(Date.now());
    const [showReminder, setShowReminder] = useState(false);
    const fileInputRef = useRef(null);

    const [newCard, setNewCard] = useState({
        number: '',
        front: '',
        back: ''
    });

    // Cargar datos al iniciar
    useEffect(() => {
        loadFromStorage();
        loadStatsFromStorage();
    }, []);

    // Recordatorio cada hora
    useEffect(() => {
        const interval = setInterval(() => {
            const hourPassed = Date.now() - lastStudyReminder >= 3600000; // 1 hora
            if (hourPassed && !studyMode) {
                setShowReminder(true);
                setLastStudyReminder(Date.now());
            }
        }, 60000); // Revisar cada minuto

        return () => clearInterval(interval);
    }, [lastStudyReminder, studyMode]);

    const loadFromStorage = async () => {
        try {
            const result = await window.storage.get('flashcard-topics');
            if (result) {
                setTopics(JSON.parse(result.value));
            }
        } catch (error) {
            console.log('No hay datos guardados aún');
        }
    };

    const loadStatsFromStorage = async () => {
        try {
            const result = await window.storage.get('flashcard-stats');
            if (result) {
                setStudyStats(JSON.parse(result.value));
            }
        } catch (error) {
            console.log('No hay estadísticas guardadas aún');
        }
    };

    const saveToStorage = async (data) => {
        try {
            await window.storage.set('flashcard-topics', JSON.stringify(data));
        } catch (error) {
            console.error('Error al guardar:', error);
        }
    };

    const saveStatsToStorage = async (stats) => {
        try {
            await window.storage.set('flashcard-stats', JSON.stringify(stats));
        } catch (error) {
            console.error('Error al guardar estadísticas:', error);
        }
    };

    const addTopic = () => {
        if (!newTopicName.trim()) return;

        const updatedTopics = {
            ...topics,
            [newTopicName]: []
        };

        setTopics(updatedTopics);
        saveToStorage(updatedTopics);
        setNewTopicName('');
        setShowAddTopic(false);
    };

    const deleteTopic = (topicName) => {
        if (!window.confirm(`¿Eliminar el tema "${topicName}" y todas sus tarjetas?`)) return;

        const updatedTopics = { ...topics };
        delete updatedTopics[topicName];

        setTopics(updatedTopics);
        saveToStorage(updatedTopics);
        if (currentTopic === topicName) {
            setCurrentTopic('');
        }
    };

    const addCard = () => {
        if (!newCard.front.trim() || !newCard.back.trim() || !currentTopic) return;

        const existingCards = topics[currentTopic] || [];
        let maxNumber = 0;
        existingCards.forEach(c => {
            const num = parseInt(c.number);
            if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        });

        const card = {
            id: Date.now(),
            number: newCard.number || (maxNumber + 1),
            front: newCard.front,
            back: newCard.back,
            difficulty: 0, // 0 = nueva, positivo = difícil, negativo = fácil
            lastStudied: null,
            correctCount: 0,
            incorrectCount: 0
        };

        const updatedTopics = {
            ...topics,
            [currentTopic]: [...topics[currentTopic], card]
        };

        setTopics(updatedTopics);
        saveToStorage(updatedTopics);
        setNewCard({ number: '', front: '', back: '' });
        setShowAddCard(false);
    };

    const parseAndAddBulkCards = () => {
        if (!bulkText.trim() || !currentTopic) return;

        const lines = bulkText.split('\n');
        const cards = [];
        let currentCard = null;
        let readingBack = false;

        const existingCards = topics[currentTopic] || [];
        let maxNumber = 0;
        existingCards.forEach(card => {
            const num = parseInt(card.number);
            if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        });

        let cardCounter = maxNumber + 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.match(/^Tarjeta\s+(\d+)/i)) {
                if (currentCard && currentCard.front.trim() && currentCard.back.trim()) {
                    cards.push(currentCard);
                    cardCounter++;
                }
                currentCard = {
                    id: Date.now() + i,
                    number: cardCounter,
                    front: '',
                    back: '',
                    difficulty: 0,
                    lastStudied: null,
                    correctCount: 0,
                    incorrectCount: 0
                };
                readingBack = false;
            }
            else if (line.match(/^Frente:/i)) {
                if (currentCard) {
                    const content = line.replace(/^Frente:\s*/i, '').trim();
                    currentCard.front = content;
                    readingBack = false;
                }
            }
            else if (line.match(/^Reverso:/i)) {
                if (currentCard) {
                    const content = line.replace(/^Reverso:\s*/i, '').trim();
                    currentCard.back = content;
                    readingBack = true;
                }
            }
            else if (line && currentCard) {
                if (readingBack) {
                    if (currentCard.back) {
                        currentCard.back += '\n' + line;
                    } else {
                        currentCard.back = line;
                    }
                } else if (currentCard.front) {
                    currentCard.front += '\n' + line;
                }
            }
        }

        if (currentCard && currentCard.front.trim() && currentCard.back.trim()) {
            cards.push(currentCard);
        }

        if (cards.length === 0) {
            alert('No se pudieron procesar las tarjetas. Verifica el formato:\n\nTarjeta 1\nFrente: Tu pregunta\nReverso:\nTu respuesta');
            return;
        }

        const updatedTopics = {
            ...topics,
            [currentTopic]: [...topics[currentTopic], ...cards]
        };

        setTopics(updatedTopics);
        saveToStorage(updatedTopics);
        setBulkText('');
        setShowAddCard(false);
        setAddMode('single');
        alert(`✓ Se agregaron ${cards.length} tarjeta(s) exitosamente (números ${maxNumber + 1} - ${maxNumber + cards.length})`);
    };

    const deleteCard = (cardId) => {
        const updatedTopics = {
            ...topics,
            [currentTopic]: topics[currentTopic].filter(c => c.id !== cardId)
        };

        setTopics(updatedTopics);
        saveToStorage(updatedTopics);
    };

    const startEditing = (card) => {
        setEditingCard({ ...card });
    };

    const saveEdit = () => {
        if (!editingCard) return;

        const updatedTopics = {
            ...topics,
            [currentTopic]: topics[currentTopic].map(c =>
                c.id === editingCard.id ? editingCard : c
            )
        };

        setTopics(updatedTopics);
        saveToStorage(updatedTopics);
        setEditingCard(null);
    };

    const exportToJSON = () => {
        const dataStr = JSON.stringify({ topics, stats: studyStats }, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tarjetas-estudio-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const importFromJSON = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (typeof importedData !== 'object') {
                    alert('El archivo no tiene el formato correcto');
                    return;
                }

                const shouldMerge = window.confirm('¿Deseas combinar con tus tarjetas existentes?\n\nOK = Combinar\nCancelar = Reemplazar todo');

                let finalTopics, finalStats;
                if (shouldMerge) {
                    finalTopics = { ...topics };
                    Object.keys(importedData.topics || importedData).forEach(topic => {
                        const topicsData = importedData.topics || importedData;
                        if (finalTopics[topic]) {
                            finalTopics[topic] = [...finalTopics[topic], ...topicsData[topic]];
                        } else {
                            finalTopics[topic] = topicsData[topic];
                        }
                    });
                    finalStats = { ...studyStats, ...(importedData.stats || {}) };
                } else {
                    finalTopics = importedData.topics || importedData;
                    finalStats = importedData.stats || {};
                }

                setTopics(finalTopics);
                setStudyStats(finalStats);
                saveToStorage(finalTopics);
                saveStatsToStorage(finalStats);
                alert('✓ Tarjetas importadas exitosamente');
            } catch (error) {
                alert('Error al leer el archivo. Asegúrate de que sea un archivo JSON válido.');
                console.error(error);
            }
        };
        reader.readAsText(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const generateSmartStudyQueue = (topicName) => {
        const cards = topics[topicName] || [];
        if (cards.length === 0) return [];

        // Ordenar por prioridad: dificultad + tiempo sin estudiar
        const now = Date.now();
        const prioritizedCards = cards.map(card => {
            let priority = card.difficulty || 0;

            if (card.lastStudied) {
                const daysSince = (now - card.lastStudied) / (1000 * 60 * 60 * 24);
                priority += daysSince * 0.5; // Aumenta prioridad con el tiempo
            } else {
                priority += 10; // Prioridad alta para tarjetas nunca estudiadas
            }

            return { ...card, priority };
        });

        prioritizedCards.sort((a, b) => b.priority - a.priority);
        return prioritizedCards;
    };

    const startStudyMode = () => {
        if (!currentTopic || topics[currentTopic].length === 0) return;

        const queue = generateSmartStudyQueue(currentTopic);
        setStudyQueue(queue);
        setStudyMode(true);
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setShowReminder(false);
    };

    const recordAnswer = (correct) => {
        const card = studyQueue[currentCardIndex];

        // Actualizar tarjeta
        const updatedCard = {
            ...card,
            lastStudied: Date.now(),
            correctCount: correct ? card.correctCount + 1 : card.correctCount,
            incorrectCount: correct ? card.incorrectCount : card.incorrectCount + 1,
            difficulty: correct ? Math.max(card.difficulty - 1, -5) : Math.min(card.difficulty + 2, 10)
        };

        // Actualizar en topics
        const updatedTopics = {
            ...topics,
            [currentTopic]: topics[currentTopic].map(c =>
                c.id === card.id ? updatedCard : c
            )
        };
        setTopics(updatedTopics);
        saveToStorage(updatedTopics);

        // Actualizar estadísticas
        const today = new Date().toISOString().split('T')[0];
        const updatedStats = { ...studyStats };

        if (!updatedStats[today]) {
            updatedStats[today] = {};
        }
        if (!updatedStats[today][currentTopic]) {
            updatedStats[today][currentTopic] = { correct: 0, incorrect: 0, total: 0 };
        }

        updatedStats[today][currentTopic].total += 1;
        if (correct) {
            updatedStats[today][currentTopic].correct += 1;
        } else {
            updatedStats[today][currentTopic].incorrect += 1;
        }

        setStudyStats(updatedStats);
        saveStatsToStorage(updatedStats);

        // Siguiente tarjeta
        setShowAnswer(false);
        if (currentCardIndex < studyQueue.length - 1) {
            setCurrentCardIndex(currentCardIndex + 1);
        } else {
            alert(`¡Sesión completada! 🎉\n\nEstudiaste ${studyQueue.length} tarjetas de ${currentTopic}`);
            setStudyMode(false);
        }
    };

    const nextCard = () => {
        setShowAnswer(false);
        setCurrentCardIndex((prev) => (prev + 1) % studyQueue.length);
    };

    const prevCard = () => {
        setShowAnswer(false);
        setCurrentCardIndex((prev) =>
            prev === 0 ? studyQueue.length - 1 : prev - 1
        );
    };

    const getTopicStats = (topicName) => {
        let totalCorrect = 0;
        let totalIncorrect = 0;
        const cards = topics[topicName] || [];

        cards.forEach(card => {
            totalCorrect += card.correctCount || 0;
            totalIncorrect += card.incorrectCount || 0;
        });

        const total = totalCorrect + totalIncorrect;
        const percentage = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

        return { totalCorrect, totalIncorrect, total, percentage };
    };

    const getDailyStats = () => {
        const last7Days = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days.push(dateStr);
        }

        return last7Days.map(date => {
            const dayStats = studyStats[date] || {};
            let totalCards = 0;
            Object.values(dayStats).forEach(topic => {
                totalCards += topic.total || 0;
            });
            return { date, total: totalCards };
        });
    };

    const getTopicRecommendations = () => {
        const recommendations = [];

        Object.keys(topics).forEach(topicName => {
            const stats = getTopicStats(topicName);
            const cards = topics[topicName] || [];
            const difficultCards = cards.filter(c => (c.difficulty || 0) > 2).length;

            let priority = 0;
            let reason = '';

            if (stats.total === 0) {
                priority = 10;
                reason = 'No has estudiado este tema aún';
            } else if (stats.percentage < 50) {
                priority = 9;
                reason = `Solo ${stats.percentage}% de aciertos`;
            } else if (difficultCards > cards.length * 0.3) {
                priority = 7;
                reason = `${difficultCards} tarjetas difíciles`;
            } else if (stats.percentage < 80) {
                priority = 5;
                reason = `${stats.percentage}% de aciertos, puedes mejorar`;
            } else {
                priority = 3;
                reason = `¡Vas bien! ${stats.percentage}% de aciertos`;
            }

            recommendations.push({ topicName, priority, reason, stats });
        });

        recommendations.sort((a, b) => b.priority - a.priority);
        return recommendations;
    };

    const currentCards = currentTopic ? topics[currentTopic] : [];

    // MODO ESTUDIO
    if (studyMode && studyQueue.length > 0) {
        const card = studyQueue[currentCardIndex];

        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">{currentTopic}</h2>
                            <button
                                onClick={() => setStudyMode(false)}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                            >
                                Salir
                            </button>
                        </div>

                        <div className="text-center text-sm text-gray-600 mb-2">
                            Tarjeta {currentCardIndex + 1} de {studyQueue.length}
                        </div>

                        {card.difficulty > 0 && (
                            <div className="text-center text-xs text-orange-600 mb-2">
                                ⚠️ Tarjeta difícil - Necesita repaso
                            </div>
                        )}

                        <div
                            className="min-h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 flex items-center justify-center cursor-pointer shadow-xl"
                            onClick={() => setShowAnswer(!showAnswer)}
                        >
                            <div className="text-center text-white w-full">
                                <p className="text-sm mb-2 opacity-80">
                                    {showAnswer ? 'Reverso' : 'Frente'}
                                </p>
                                <div className="text-xl font-semibold whitespace-pre-wrap break-words max-w-full px-4">
                                    {showAnswer ? card.back : card.front}
                                </div>
                                <p className="text-sm mt-4 opacity-70">
                                    Toca para voltear
                                </p>
                            </div>
                        </div>

                        {showAnswer ? (
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => recordAnswer(false)}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                                >
                                    ❌ No supe
                                </button>
                                <button
                                    onClick={() => recordAnswer(true)}
                                    className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
                                >
                                    ✓ Sí supe
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-between mt-6">
                                <button
                                    onClick={prevCard}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                    <ChevronLeft size={20} />
                                    Anterior
                                </button>

                                <button
                                    onClick={() => setShowAnswer(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                                >
                                    <Eye size={20} />
                                    Mostrar respuesta
                                </button>

                                <button
                                    onClick={nextCard}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                    Siguiente
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // VISTA DE ESTADÍSTICAS
    if (view === 'stats') {
        const dailyStats = getDailyStats();
        const recommendations = getTopicRecommendations();

        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <BarChart3 className="text-purple-600" size={32} />
                                Estadísticas
                            </h1>
                            <button
                                onClick={() => setView('topics')}
                                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                            >
                                Volver a Tarjetas
                            </button>
                        </div>

                        {/* Actividad de los últimos 7 días */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp size={20} />
                                Actividad de los últimos 7 días
                            </h2>
                            <div className="flex items-end gap-2 h-32">
                                {dailyStats.map((day, idx) => {
                                    const maxCards = Math.max(...dailyStats.map(d => d.total), 1);
                                    const height = (day.total / maxCards) * 100;
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center">
                                            <div
                                                className="w-full bg-purple-500 rounded-t transition-all hover:bg-purple-600"
                                                style={{ height: `${height}%`, minHeight: day.total > 0 ? '4px' : '0' }}
                                                title={`${day.total} tarjetas`}
                                            />
                                            <p className="text-xs mt-2 text-gray-600">
                                                {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                                            </p>
                                            <p className="text-xs text-gray-500">{day.total}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recomendaciones */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Brain size={20} />
                                Recomendaciones de estudio
                            </h2>
                            <div className="space-y-3">
                                {recommendations.map((rec, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-4 rounded-lg border-l-4 ${rec.priority >= 8 ? 'border-red-500 bg-red-50' :
                                            rec.priority >= 6 ? 'border-orange-500 bg-orange-50' :
                                                rec.priority >= 4 ? 'border-yellow-500 bg-yellow-50' :
                                                    'border-green-500 bg-green-50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-gray-800">{rec.topicName}</h3>
                                                <p className="text-sm text-gray-600">{rec.reason}</p>
                                                {rec.stats.total > 0 && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {rec.stats.totalCorrect} correctas / {rec.stats.total} totales
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bold ${rec.priority >= 8 ? 'text-red-600' :
                                                    rec.priority >= 6 ? 'text-orange-600' :
                                                        rec.priority >= 4 ? 'text-yellow-600' :
                                                            'text-green-600'
                                                    }`}>
                                                    {rec.stats.total > 0 ? `${rec.stats.percentage}%` : 'Nuevo'}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setCurrentTopic(rec.topicName);
                                                        setView('topics');
                                                        setTimeout(() => startStudyMode(), 100);
                                                    }}
                                                    className="mt-2 text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                                                >
                                                    Estudiar ahora
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {recommendations.length === 0 && (
                                    <p className="text-gray-500 text-center py-8">
                                        No hay datos suficientes aún. ¡Empieza a estudiar!
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Estadísticas por tema */}
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Progreso por tema</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {Object.keys(topics).map(topicName => {
                                    const stats = getTopicStats(topicName);
                                    return (
                                        <div key={topicName} className="bg-gray-50 p-4 rounded-lg">
                                            <h3 className="font-semibold mb-2">{topicName}</h3>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Correctas: {stats.totalCorrect}</span>
                                                <span>Incorrectas: {stats.totalIncorrect}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full"
                                                    style={{ width: `${stats.percentage}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">{stats.percentage}% de aciertos</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // VISTA PRINCIPAL
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
            {/* Recordatorio de estudio */}
            {showReminder && (
                <div className="fixed top-4 right-4 bg-purple-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm animate-bounce">
                    <div className="flex items-center gap-3">
                        <Clock size={24} />
                        <div>
                            <p className="font-semibold">¡Hora de estudiar!</p>
                            <p className="text-sm">Ha pasado una hora. ¿Listo para repasar?</p>
                        </div>
                        <button
                            onClick={() => setShowReminder(false)}
                            className="ml-2"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setShowReminder(false);
                            if (Object.keys(topics).length > 0) {
                                const topicsList = Object.keys(topics);
                                setCurrentTopic(topicsList[0]);
                                setTimeout(() => startStudyMode(), 100);
                            }
                        }}
                        className="mt-3 w-full bg-white text-purple-600 py-2 rounded font-semibold hover:bg-gray-100"
                    >
                        Empezar ahora
                    </button>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Book className="text-purple-600" size={32} />
                            <h1 className="text-3xl font-bold text-gray-800">Tarjetas de Estudio</h1>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setView('stats')}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                                title="Ver estadísticas"
                            >
                                <BarChart3 size={20} />
                                <span className="hidden sm:inline">Estadísticas</span>
                            </button>
                            <button
                                onClick={exportToJSON}
                                disabled={Object.keys(topics).length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                title="Exportar todas las tarjetas"
                            >
                                <Download size={20} />
                                <span className="hidden sm:inline">Exportar</span>
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                title="Importar tarjetas desde archivo"
                            >
                                <Upload size={20} />
                                <span className="hidden sm:inline">Importar</span>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={importFromJSON}
                                className="hidden"
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-1 bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-gray-700">Temas</h2>
                                <button
                                    onClick={() => setShowAddTopic(true)}
                                    className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {showAddTopic && (
                                <div className="mb-4 p-3 bg-white rounded-lg shadow">
                                    <input
                                        type="text"
                                        placeholder="Nombre del tema"
                                        value={newTopicName}
                                        onChange={(e) => setNewTopicName(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg mb-2"
                                        onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={addTopic}
                                            className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                        >
                                            Agregar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddTopic(false);
                                                setNewTopicName('');
                                            }}
                                            className="px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {Object.keys(topics).map((topic) => {
                                    const stats = getTopicStats(topic);
                                    return (
                                        <div
                                            key={topic}
                                            className={`p-3 rounded-lg cursor-pointer transition ${currentTopic === topic
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-white hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div
                                                    onClick={() => setCurrentTopic(topic)}
                                                    className="flex-1"
                                                >
                                                    <p className="font-medium">{topic}</p>
                                                    <p className="text-xs opacity-75">
                                                        {topics[topic].length} tarjetas
                                                        {stats.total > 0 && ` · ${stats.percentage}% aciertos`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => deleteTopic(topic)}
                                                    className={`p-1 rounded hover:bg-red-500 hover:text-white ${currentTopic === topic ? 'text-white' : 'text-red-500'
                                                        }`}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            {currentTopic ? (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold text-gray-700">
                                            {currentTopic}
                                        </h2>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={startStudyMode}
                                                disabled={currentCards.length === 0}
                                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                <Brain size={20} />
                                                Estudiar
                                            </button>
                                            <button
                                                onClick={() => setShowAddCard(true)}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                                            >
                                                <Plus size={20} />
                                                Nueva Tarjeta
                                            </button>
                                        </div>
                                    </div>

                                    {showAddCard && (
                                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                            <div className="flex gap-2 mb-4">
                                                <button
                                                    onClick={() => setAddMode('single')}
                                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${addMode === 'single'
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    Una tarjeta
                                                </button>
                                                <button
                                                    onClick={() => setAddMode('bulk')}
                                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${addMode === 'bulk'
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    Varias tarjetas
                                                </button>
                                            </div>

                                            {addMode === 'single' ? (
                                                <div>
                                                    <h3 className="font-semibold mb-3">Nueva Tarjeta</h3>
                                                    <input
                                                        type="text"
                                                        placeholder="Número (opcional)"
                                                        value={newCard.number}
                                                        onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded-lg mb-2"
                                                    />
                                                    <textarea
                                                        placeholder="Frente de la tarjeta"
                                                        value={newCard.front}
                                                        onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded-lg mb-2 h-24 font-mono text-sm"
                                                    />
                                                    <textarea
                                                        placeholder="Reverso de la tarjeta"
                                                        value={newCard.back}
                                                        onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded-lg mb-2 h-24 font-mono text-sm"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={addCard}
                                                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                                        >
                                                            Guardar
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowAddCard(false);
                                                                setNewCard({ number: '', front: '', back: '' });
                                                            }}
                                                            className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <h3 className="font-semibold mb-2">Agregar Varias Tarjetas</h3>
                                                    <p className="text-sm text-gray-600 mb-3">
                                                        Pega el texto en este formato:
                                                    </p>
                                                    <div className="bg-white p-3 rounded border mb-3 text-xs font-mono text-gray-700">
                                                        <div>Tarjeta 1</div>
                                                        <div>Frente: ¿Pregunta aquí?</div>
                                                        <div>Reverso:</div>
                                                        <div>Respuesta aquí</div>
                                                        <div>Puede tener múltiples líneas</div>
                                                        <div className="mt-2">Tarjeta 2</div>
                                                        <div>Frente: ¿Otra pregunta?</div>
                                                        <div>Reverso: Otra respuesta</div>
                                                    </div>
                                                    <textarea
                                                        placeholder="Pega tus tarjetas aquí..."
                                                        value={bulkText}
                                                        onChange={(e) => setBulkText(e.target.value)}
                                                        className="w-full px-3 py-2 border rounded-lg mb-2 h-64 font-mono text-sm"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={parseAndAddBulkCards}
                                                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                                        >
                                                            Procesar y Guardar
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowAddCard(false);
                                                                setBulkText('');
                                                            }}
                                                            className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {currentCards.map((card) => (
                                            <div key={card.id} className="bg-white p-4 rounded-lg shadow border">
                                                {editingCard?.id === card.id ? (
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={editingCard.number}
                                                            onChange={(e) => setEditingCard({ ...editingCard, number: e.target.value })}
                                                            className="w-full px-3 py-2 border rounded-lg mb-2"
                                                            placeholder="Número"
                                                        />
                                                        <textarea
                                                            value={editingCard.front}
                                                            onChange={(e) => setEditingCard({ ...editingCard, front: e.target.value })}
                                                            className="w-full px-3 py-2 border rounded-lg mb-2 h-20"
                                                        />
                                                        <textarea
                                                            value={editingCard.back}
                                                            onChange={(e) => setEditingCard({ ...editingCard, back: e.target.value })}
                                                            className="w-full px-3 py-2 border rounded-lg mb-2 h-20"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={saveEdit}
                                                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
                                                            >
                                                                <Save size={16} />
                                                                Guardar
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingCard(null)}
                                                                className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-purple-600">
                                                                    Tarjeta {card.number}
                                                                </span>
                                                                {card.difficulty > 2 && (
                                                                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                                                                        Difícil
                                                                    </span>
                                                                )}
                                                                {(card.correctCount || 0) > 0 && (
                                                                    <span className="text-xs text-gray-500">
                                                                        ✓ {card.correctCount} / ❌ {card.incorrectCount || 0}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => startEditing(card)}
                                                                    className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteCard(card.id)}
                                                                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1">Frente:</p>
                                                                <p className="text-gray-800 whitespace-pre-wrap">{card.front}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1">Reverso:</p>
                                                                <p className="text-gray-800 whitespace-pre-wrap">{card.back}</p>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <Book size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Selecciona un tema para ver sus tarjetas</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}