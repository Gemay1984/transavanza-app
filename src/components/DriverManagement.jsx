import { useState, useEffect } from 'react';
import { MapPin, CheckCircle, XCircle, ShieldAlert, BellRing, MessageSquare, Send, Navigation, History, Flag } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function DriverManagement({ drivers, setDrivers, currentUser, isAdmin, serviceRequests = [], setServiceRequests, messages, setMessages }) {
    const [newDriver, setNewDriver] = useState({ name: '', username: '', vehicle: '', phone: '', password: '' });
    const [locationPermission, setLocationPermission] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [driverHistory, setDriverHistory] = useState([]);

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

    // Load driver history
    useEffect(() => {
        if (!isAdmin && currentUser?.name) {
            supabase
                .from('completed_services')
                .select('*')
                .eq('driver_name', currentUser.name)
                .order('id', { ascending: false })
                .limit(30)
                .then(({ data }) => {
                    if (data) setDriverHistory(data);
                });
        }
    }, [currentUser, isAdmin]);

    useEffect(() => {
        // En Supabase el registro ya lo hicimos en el Login, así que aquí solo necesitamos 
        // asegurar que si es conductor, obtengamos su ID actual si no lo tenemos a la mano.
        // Pero en onLogin pasamos { role, name, id }, así que asumimos que currentUser.id existe
    }, [currentUser, isAdmin]);

    // Wake Lock para evitar que la pantalla se apague y corte el GPS
    useEffect(() => {
        let wakeLock = null;
        let cleanupVisibility = null;

        const currentDriverStatus = drivers.find(d => d.id === currentUser?.id)?.status;
        const isActiveState = currentDriverStatus === 'Disponible' || currentDriverStatus === 'En Servicio';

        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && !isAdmin && isActiveState) {
                try {
                    wakeLock = await navigator.wakeLock.request('screen');

                    const handleVisibilityChange = async () => {
                        if (wakeLock !== null && document.visibilityState === 'visible') {
                            wakeLock = await navigator.wakeLock.request('screen');
                        }
                    };

                    document.addEventListener('visibilitychange', handleVisibilityChange);
                    cleanupVisibility = () => document.removeEventListener('visibilitychange', handleVisibilityChange);

                } catch (err) {
                    console.log('Wake Lock request failed:', err.message);
                }
            }
        };

        requestWakeLock();

        return () => {
            if (cleanupVisibility) cleanupVisibility();
            if (wakeLock) {
                wakeLock.release().catch(() => { });
            }
        };
    }, [drivers, currentUser, isAdmin]);

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

    const updateStatus = async (id, newStatus) => {
        const driverToUpdate = drivers.find(d => d.id === id);
        if (!driverToUpdate) return;

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
                                <br /><br />
                                <strong style={{ color: 'var(--warning)' }}>Nota importante:</strong> Mantén esta pestaña abierta y en primer plano para asegurar que el sistema actualice tu posición sin interrupciones.
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
                                            <MapPin size={14} color={
                                                driver.status === 'Disponible' ? "var(--accent-secondary)" :
                                                    driver.status === 'En Servicio' ? "var(--warning)" : "var(--danger)"
                                            } />
                                            {driver.status === 'Disponible' ? "En línea - GPS activo" :
                                                driver.status === 'En Servicio' ? "En ruta de servicio" : "Inactivo / Ocupado"}
                                        </span>
                                    </div>
                                </div>

                                <select
                                    className="glass-input"
                                    value={driver.status}
                                    onChange={(e) => updateStatus(driver.id, e.target.value)}
                                    disabled={!isAdmin && locationPermission !== 'granted'}
                                    style={{
                                        padding: '8px 12px',
                                        minWidth: '140px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        border: `1px solid ${driver.status === 'Disponible' ? 'var(--success)' : driver.status === 'En Servicio' ? 'var(--warning)' : 'var(--danger)'}`,
                                        background: driver.status === 'Disponible' ? 'rgba(0,184,148,0.1)' : driver.status === 'En Servicio' ? 'rgba(253,203,110,0.1)' : 'rgba(255,118,117,0.1)',
                                        color: driver.status === 'Disponible' ? 'var(--success)' : driver.status === 'En Servicio' ? 'var(--warning)' : 'var(--danger)'
                                    }}
                                >
                                    <option value="Disponible" style={{ background: 'var(--bg-primary)' }}>🟢 Disponible</option>
                                    <option value="En Servicio" style={{ background: 'var(--bg-primary)' }}>🟡 En Servicio</option>
                                    <option value="Ocupado" style={{ background: 'var(--bg-primary)' }}>🔴 Ocupado</option>
                                </select>
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
                                            <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{req.location.split('| GPS:')[0]}</h4>

                                            {req.location.includes('GPS: ') && (
                                                <button
                                                    onClick={() => window.open(req.location.split('GPS: ')[1], '_blank')}
                                                    style={{
                                                        marginTop: '8px', padding: '6px 12px', fontSize: '0.85rem',
                                                        background: 'rgba(9, 132, 227, 0.1)', border: '1px solid var(--accent-secondary)',
                                                        color: 'var(--accent-secondary)', borderRadius: '6px', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500'
                                                    }}
                                                >
                                                    <Navigation size={14} /> 🗺️ Navegar a ruta
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <button
                                                className="glass-button success"
                                                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                                                disabled={locationPermission !== 'granted'} // Prevent accepting if no GPS
                                                onClick={async () => {
                                                    const currentDriverState = drivers.find(d => d.id === currentUser.id);
                                                    if (!currentDriverState || currentDriverState.status !== 'Disponible') {
                                                        alert("Solo puedes aceptar servicios si tu estado es 'Disponible'. Por favor, cambia tu estado primero.");
                                                        return;
                                                    }

                                                    // Cambiar estado del conductor a 'En Servicio'
                                                    await supabase
                                                        .from('drivers')
                                                        .update({ status: 'En Servicio' })
                                                        .eq('id', currentUser.id);

                                                    // Avisar al administrador
                                                    await supabase
                                                        .from('messages')
                                                        .insert([{
                                                            text: `✅ El conductor ${currentUser.name} ha ACEPTADO el servicio en ${req.location}.`,
                                                            sender: "Sistema",
                                                            recipient: "Administrador",
                                                            time: new Date().toLocaleTimeString()
                                                        }]);

                                                    // Variables para notificar al cliente (si aplica)
                                                    let clientName = null;
                                                    const refMatch = req.location.match(/\(Ref: (.*?) -/);
                                                    if (refMatch && refMatch[1]) {
                                                        clientName = refMatch[1].trim();
                                                    }

                                                    // Guardar registro histórico del servicio prestado
                                                    await supabase
                                                        .from('completed_services')
                                                        .insert([{
                                                            type: req.type,
                                                            location: req.location,
                                                            driver_name: currentUser.name,
                                                            accepted_time: new Date().toLocaleTimeString()
                                                        }]);

                                                    // Eliminar solicitud de la cola
                                                    await supabase
                                                        .from('service_requests')
                                                        .delete()
                                                        .eq('id', req.id);

                                                    // Alertar al pasajero/cliente si extrajimos su nombre
                                                    if (clientName) {
                                                        await supabase.from('messages').insert([{
                                                            text: `🚗 ¡CONDUCTOR ASIGNADO!\nConductor: ${currentUser.name}\nPlaca: ${currentDriverState.vehicle}`,
                                                            sender: "Sistema",
                                                            recipient: clientName,
                                                            time: new Date().toLocaleTimeString()
                                                        }]);
                                                    }

                                                    alert(`¡Has aceptado el servicio en ${req.location}!\nTu estado cambió a "En Servicio".`);
                                                }}
                                            >
                                                <CheckCircle size={16} /> Aceptar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}


                {/* Botón Finalizar Servicio - Solo cuando conductor está 'En Servicio' */}
                {!isAdmin && currentUser && drivers.find(d => d.id === currentUser.id)?.status === 'En Servicio' && (
                    <div style={{
                        marginTop: '24px', padding: '20px',
                        background: 'rgba(253,203,110,0.08)', border: '2px solid var(--warning)',
                        borderRadius: '16px', textAlign: 'center'
                    }}>
                        <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: '8px', fontSize: '1rem' }}>
                            🟡 Actualmente en ruta de servicio
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                            Cuando llegues al destino y entregues el servicio, presiona el botón para marcarlo como completado.
                        </p>
                        <button
                            className="glass-button"
                            style={{
                                borderColor: 'var(--success)', color: 'var(--success)',
                                padding: '14px 28px', fontSize: '1rem', fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', gap: '8px'
                            }}
                            onClick={async () => {
                                if (!window.confirm('¿Confirmas que el servicio fue completado?')) return;

                                // Cambiar estado a Disponible de nuevo
                                await supabase
                                    .from('drivers')
                                    .update({ status: 'Disponible' })
                                    .eq('id', currentUser.id);

                                // Aviso al admin
                                await supabase.from('messages').insert([{
                                    text: `✅ El conductor ${currentUser.name} ha FINALIZADO su servicio y está Disponible nuevamente.`,
                                    sender: "Sistema",
                                    recipient: "Administrador",
                                    time: new Date().toLocaleTimeString()
                                }]);

                                // Reload history
                                const { data } = await supabase.from('completed_services').select('*').eq('driver_name', currentUser.name).order('id', { ascending: false }).limit(30);
                                if (data) setDriverHistory(data);

                                alert('✅ ¡Servicio finalizado exitosamente! Ahora estás Disponible.');
                            }}
                        >
                            <Flag size={18} /> Finalizar Servicio Completado
                        </button>
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

            {/* Historial de viajes del conductor */}
            {!isAdmin && currentUser && (
                <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1', marginTop: '0' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={20} color="var(--accent-primary)" />
                        Mi Historial de Servicios
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                            {driverHistory.length} registros
                        </span>
                    </h3>

                    {driverHistory.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No tienes servicios registrados aún.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                                        <th style={{ padding: '8px 12px' }}>Tipo</th>
                                        <th style={{ padding: '8px 12px' }}>Recogida</th>
                                        <th style={{ padding: '8px 12px' }}>Hora</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {driverHistory.map((svc, i) => (
                                        <tr key={svc.id || i} style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                                        }}>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ background: 'var(--accent-gradient)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{svc.type}</span>
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {svc.location?.split('| GPS:')[0]}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{svc.accepted_time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
