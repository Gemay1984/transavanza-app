import { useState } from 'react';
import { BellRing, MessageSquare, Send, CheckCircle, Navigation, Plus } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabaseClient';

export default function AdminDashboard({ drivers, setDrivers, serviceRequests, setServiceRequests, messages, setMessages }) {
    const [newMessage, setNewMessage] = useState("");
    const [recipient, setRecipient] = useState("Todos");

    // Formulario de nueva solicitud
    const [newRequest, setNewRequest] = useState({ type: 'Estandar', location: '' });

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage) return;

        await supabase.from('messages').insert([{
            text: newMessage,
            sender: "Administrador",
            recipient: recipient,
            time: new Date().toLocaleTimeString()
        }]);

        setNewMessage("");
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        if (!newRequest.location) return;

        await supabase.from('service_requests').insert([{
            type: newRequest.type,
            location: newRequest.location,
            status: 'pending',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        setNewRequest({ type: 'Estandar', location: '' });
    };

    const activeDrivers = drivers.filter(d => d.status === 'Disponible');
    const occupiedDrivers = drivers.filter(d => d.status === 'Ocupado');

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', animation: 'fadeIn 0.5s ease' }}>

            {/* Columna Izquierda: Mapa, Nueva Solicitud y Lista */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Mapa Simulado / Seguimiento GPS */}
                <div className="glass-panel" style={{ padding: '24px', height: '350px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Navigation size={20} color="var(--accent-secondary)" />
                            Seguimiento GPS en Tiempo Real
                        </h3>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></span>
                                {activeDrivers.length} Disponibles
                            </span>
                            <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }}></span>
                                {occupiedDrivers.length} Ocupados
                            </span>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        borderRadius: '12px',
                        border: '1px solid var(--border-glass)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <MapContainer center={[4.6097, -74.0817]} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                            {drivers.map(driver => (
                                <Marker
                                    key={driver.id}
                                    position={[driver.location.lat, driver.location.lng]}
                                    icon={L.divIcon({
                                        className: 'custom-leaflet-marker',
                                        html: `<div style="
                                            background: ${driver.status === 'Disponible' ? 'var(--success)' : 'var(--danger)'};
                                            width: 16px; height: 16px; border-radius: 50%;
                                            box-shadow: 0 0 10px ${driver.status === 'Disponible' ? 'var(--success)' : 'var(--danger)'};
                                            border: 2px solid white;"></div>
                                            <span style="position: absolute; top: 18px; left: -10px; font-size: 0.75rem; font-weight: 600; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; white-space: nowrap; color: white;">${driver.vehicle}</span>
                                        `
                                    })}
                                >
                                    <Popup>
                                        <strong>{driver.name}</strong><br />
                                        Placa: {driver.vehicle}<br />
                                        Estado: {driver.status}
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>

                {/* Formulario Nueva Solicitud y Tablero de Solicitudes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>

                    {/* Crear Solicitud */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                            <Plus size={20} color="var(--success)" />
                            Nuevo Servicio
                        </h3>
                        <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tipo de Servicio</label>
                                <select
                                    className="glass-input"
                                    value={newRequest.type}
                                    onChange={e => setNewRequest({ ...newRequest, type: e.target.value })}
                                    style={{ marginTop: '4px' }}
                                >
                                    <option value="Estandar" style={{ background: 'var(--bg-primary)' }}>Estándar</option>
                                    <option value="VIP" style={{ background: 'var(--bg-primary)' }}>VIP</option>
                                    <option value="Carga" style={{ background: 'var(--bg-primary)' }}>Carga / Mensajería</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ubicación de Recogida</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="Ej. Calle 100 #15-20"
                                    value={newRequest.location}
                                    onChange={e => setNewRequest({ ...newRequest, location: e.target.value })}
                                    style={{ marginTop: '4px' }}
                                    required
                                />
                            </div>
                            <button type="submit" className="glass-button primary" style={{ marginTop: '8px' }}>Ingresar a Cola</button>
                        </form>
                    </div>

                    {/* Lista Solicitudes */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                            <BellRing size={20} color="var(--warning)" />
                            Solicitudes Activas
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                            {serviceRequests.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>No hay solicitudes pendientes.</p>
                            ) : (
                                serviceRequests.map((req, i) => (
                                    <div key={req.id} style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border-glass)',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        animation: `fadeIn 0.3s ease ${i * 0.1}s forwards`,
                                        opacity: 0
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ background: 'var(--accent-gradient)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>{req.type}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{req.time}</span>
                                            </div>
                                            <h4 style={{ fontSize: '1.05rem' }}>{req.location}</h4>
                                        </div>
                                        <button
                                            className="glass-button success"
                                            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                                            onClick={async () => {
                                                const availableDriver = drivers.find(d => d.status === 'Disponible');
                                                if (availableDriver) {
                                                    // Actualizar el estado del conductor a 'Ocupado' en Supabase
                                                    await supabase
                                                        .from('drivers')
                                                        .update({ status: 'Ocupado' })
                                                        .eq('id', availableDriver.id);

                                                    // Enviar mensaje automático al conductor en Supabase
                                                    await supabase
                                                        .from('messages')
                                                        .insert([{
                                                            text: `🚨 ¡NUEVO SERVICIO ASIGNADO! 🚨\nLugar de Recogida: ${req.location}\nTipo de Servicio: ${req.type}\nHora de solicitud: ${req.time}`,
                                                            sender: "Sistema",
                                                            recipient: availableDriver.name,
                                                            time: new Date().toLocaleTimeString()
                                                        }]);

                                                    // Eliminar la solicitud asignada
                                                    await supabase
                                                        .from('service_requests')
                                                        .delete()
                                                        .eq('id', req.id);

                                                    alert(`Servicio asignado a: ${availableDriver.name} (${availableDriver.vehicle})`);
                                                } else {
                                                    alert('No hay conductores disponibles actualmente.');
                                                }
                                            }}
                                        >
                                            <CheckCircle size={16} /> Asignar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Columna Derecha: Mensajería */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={20} color="var(--accent-primary)" />
                    Mensajes a la Flota
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
                    {messages.map(msg => (
                        <div key={msg.id} style={{
                            background: msg.sender === 'Administrador' ? 'rgba(108, 92, 231, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${msg.sender === 'Administrador' ? 'rgba(108, 92, 231, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '8px',
                            padding: '12px'
                        }}>
                            <p style={{ fontSize: '0.95rem', marginBottom: '8px' }}>{msg.text}</p>
                            <span style={{ fontSize: '0.75rem', color: msg.sender === 'Administrador' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                                {msg.sender} {msg.recipient && msg.recipient !== 'Todos' ? `(Privado a ${msg.recipient})` : '(Público)'} • {msg.time}
                            </span>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <select
                        className="glass-input"
                        style={{ padding: '8px', fontSize: '0.9rem' }}
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                    >
                        <option value="Todos">Enviar a: Todos (Público)</option>
                        {drivers.map(d => (
                            <option key={d.id} value={d.name}>Privado: {d.name}</option>
                        ))}
                    </select>
                    <div style={{ display: 'flex', gap: '12px' }}>
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
                    </div>
                </form>
            </div>

        </div>
    );
}
