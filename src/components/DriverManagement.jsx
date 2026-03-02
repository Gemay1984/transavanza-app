import { useState, useEffect } from 'react';
import { MapPin, CheckCircle, XCircle, ShieldAlert, BellRing, MessageSquare, Send } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function DriverManagement({ drivers, setDrivers, currentUser, isAdmin, serviceRequests = [], setServiceRequests, messages, setMessages }) {
    const [newDriver, setNewDriver] = useState({ name: '', username: '', vehicle: '', phone: '', password: '' });
    const [locationPermission, setLocationPermission] = useState(null);
    const [newMessage, setNewMessage] = useState("");

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage) return;

        await supabase.from('messages').insert([{
            text: newMessage,
            sender: currentUser?.name || "Conductor",
            recipient: 'Todos',
            time: new Date().toLocaleTimeString()
        }]);

        setNewMessage("");
    };

    useEffect(() => {
        // En Supabase el registro ya lo hicimos en el Login, así que aquí solo necesitamos 
        // asegurar que si es conductor, obtengamos su ID actual si no lo tenemos a la mano.
        // Pero en onLogin pasamos { role, name, id }, así que asumimos que currentUser.id existe
    }, [currentUser, isAdmin]);

    // Solicitud de permisos GPS y Tracking continuo
    const requestGPSPermission = () => {
        if ('geolocation' in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    setLocationPermission('granted');
                    // Actualizar la ubicación del conductor en la base de datos Supabase
                    if (currentUser && !isAdmin && currentUser.id) {
                        try {
                            await supabase
                                .from('drivers')
                                .update({
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude
                                })
                                .eq('id', currentUser.id);
                        } catch (err) {
                            console.error("Error updating GPS in Supabase:", err);
                        }
                    }
                },
                (error) => {
                    setLocationPermission('denied');
                    console.error("Error obteniendo ubicación:", error);
                },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );

            // Cleanup watcher on unmount (opcional para esta demo, pero recomendado)
            return () => navigator.geolocation.clearWatch(watchId);

        } else {
            setLocationPermission('unsupported');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!newDriver.name || !newDriver.username || !newDriver.vehicle || !newDriver.password) return;

        const { data, error } = await supabase.from('drivers').insert([{
            name: newDriver.name,
            username: newDriver.username,
            password: newDriver.password,
            vehicle: newDriver.vehicle,
            phone: newDriver.phone,
            status: 'Disponible'
        }]);

        if (error) {
            console.error("Supabase Insert Error:", error);
            alert("Error al registrar: " + error.message);
            return;
        }

        setNewDriver({ name: '', username: '', vehicle: '', phone: '', password: '' });
        alert(`Conductor agregado.\nUsuario: ${newDriver.username}\nContraseña: ${newDriver.password}`);
    };

    const toggleStatus = async (id) => {
        const driverToUpdate = drivers.find(d => d.id === id);
        if (!driverToUpdate) return;

        const newStatus = driverToUpdate.status === 'Disponible' ? 'Ocupado' : 'Disponible';

        await supabase
            .from('drivers')
            .update({ status: newStatus })
            .eq('id', id);
    };

    // Si es conductor, solo muestra su propio estado
    const displayedDrivers = isAdmin ? drivers : drivers.filter(d => d.name === currentUser?.name);

    return (
        <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 2fr' : '1.5fr 1fr', gap: '24px' }}>
            {/* Columna Izquierda: Registro (Solo Admin) o Permisos GPS (Todos) */}

            {isAdmin ? (
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '24px' }}>Registrar Conductor</h3>

                    <form onSubmit={handleRegister}>
                        <div className="input-group">
                            <label>Nombres y Apellidos</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Ej. Juan Pérez"
                                value={newDriver.name}
                                onChange={e => setNewDriver({ ...newDriver, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Usuario (para iniciar sesión)</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Ej. juanperez"
                                value={newDriver.username}
                                onChange={e => setNewDriver({ ...newDriver, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Placa del Vehículo</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Ej. ABC-123"
                                value={newDriver.vehicle}
                                onChange={e => setNewDriver({ ...newDriver, vehicle: e.target.value })}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Teléfono</label>
                            <input
                                type="tel"
                                className="glass-input"
                                placeholder="Ej. 300 123 4567"
                                value={newDriver.phone}
                                onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label>Contraseña Asignada</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Contraseña para el conductor"
                                value={newDriver.password}
                                onChange={e => setNewDriver({ ...newDriver, password: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="glass-button primary" style={{ width: '100%', marginTop: '16px' }}>
                            Agregar a Flota
                        </button>
                    </form>
                </div>
            ) : (
                <>
                    {locationPermission !== 'granted' && (
                        <div className="glass-panel" style={{ gridColumn: '1 / -1', background: 'rgba(255,118,117,0.1)', border: '1px solid var(--danger)', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)', marginBottom: '16px' }}>
                                <ShieldAlert size={24} />
                                <h3 style={{ fontWeight: 600, margin: 0 }}>Permisos de Rastreo Requeridos</h3>
                            </div>
                            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
                                El administrador necesita tu ubicación en tiempo real para asignarte servicios. Por favor autoriza el uso de GPS.
                            </p>
                            <button className="glass-button" onClick={requestGPSPermission} style={{ width: '100%', borderColor: 'var(--danger)', padding: '16px', fontSize: '1.1rem' }}>
                                Permitir Rastreo GPS
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Columna Derecha: Flota Activa (Admin ve todos, Conductor ve su estado) */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3>{isAdmin ? "Flota Activa" : "Mi Estado Actual"}</h3>
                    {isAdmin && (
                        <span style={{ background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {drivers.length} Conductores
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {displayedDrivers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            No hay información disponible.
                        </div>
                    ) : (
                        displayedDrivers.map(driver => (
                            <div key={driver.id} style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '12px',
                                padding: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{driver.name}</h4>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        <span>Placa: {driver.vehicle}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={14} color={driver.status === 'Disponible' ? "var(--accent-secondary)" : "var(--danger)"} />
                                            {driver.status === 'Disponible' ? "Transmitiendo" : "Ocupado / Inactivo"}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    className={`glass-button ${driver.status === 'Disponible' ? 'success' : 'danger'}`}
                                    onClick={() => toggleStatus(driver.id)}
                                    disabled={!isAdmin && locationPermission !== 'granted'} // Un conductor sin GPS no puede ponerse disponible si es su primera vez, pero sí ocupado? 
                                    style={{ padding: '12px 20px', minWidth: '140px' }}
                                >
                                    {driver.status === 'Disponible' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                    {driver.status}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Solicitudes de Servicio (Solo para Conductores Disponibles) */}
                {!isAdmin && currentUser && (
                    <div style={{ marginTop: '32px' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BellRing size={20} color="var(--warning)" />
                            Servicios Disponibles
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {serviceRequests.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                                    No hay solicitudes de servicio en este momento.
                                </div>
                            ) : (
                                serviceRequests.map(req => (
                                    <div key={req.id} style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border-glass)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ background: 'var(--accent-gradient)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>{req.type}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{req.time}</span>
                                            </div>
                                            <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{req.location}</h4>
                                        </div>
                                        <button
                                            className="glass-button success"
                                            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                                            disabled={locationPermission !== 'granted'} // Prevent accepting if no GPS
                                            onClick={async () => {
                                                // Update in Supabase
                                                await supabase
                                                    .from('service_requests')
                                                    .delete()
                                                    .eq('id', req.id);

                                                alert(`¡Has aceptado el servicio en ${req.location}!`);
                                            }}
                                        >
                                            <CheckCircle size={16} /> Aceptar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Columna Derecha para Conductores: Mensajería */}
            {!isAdmin && currentUser && (
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={20} color="var(--accent-primary)" />
                        Mensajes de la Red
                    </h3>

                    <div style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        overflowY: 'auto'
                    }}>
                        {messages.filter(msg => !msg.recipient || msg.recipient === 'Todos' || msg.recipient === currentUser.name || msg.sender === currentUser.name).map(msg => (
                            <div key={msg.id} style={{
                                background: msg.sender === 'Administrador' || msg.sender === 'Administración' || msg.sender === 'Sistema' ? 'rgba(108, 92, 231, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${msg.sender === 'Administrador' || msg.sender === 'Administración' || msg.sender === 'Sistema' ? 'rgba(108, 92, 231, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '8px',
                                padding: '12px'
                            }}>
                                <p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>{msg.text}</p>
                                <span style={{ fontSize: '0.75rem', color: msg.sender === 'Administrador' || msg.sender === 'Administración' || msg.sender === 'Sistema' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                                    {msg.sender} {msg.recipient && msg.recipient !== 'Todos' ? `(Privado)` : ''} • {msg.time}
                                </span>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Escribir mensaje..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button type="submit" className="glass-button primary" style={{ padding: '0 16px' }}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}

        </div>
    );
}
