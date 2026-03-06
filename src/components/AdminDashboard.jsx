import { useState, useEffect } from 'react';
import { BellRing, MessageSquare, Send, CheckCircle, Navigation, Plus, BarChart2, Filter, Users, Truck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import PassengerRegistration from './PassengerRegistration';

export default function AdminDashboard({ drivers, setDrivers, serviceRequests, setServiceRequests, messages, setMessages, currentUser }) {
    const [newMessage, setNewMessage] = useState("");
    const [recipient, setRecipient] = useState("Todos");
    const [selectedDrivers, setSelectedDrivers] = useState({}); // Mapeo { requestId: driverId }
    const [completedServices, setCompletedServices] = useState([]);
    const [filterDriver, setFilterDriver] = useState('');
    const [filterType, setFilterType] = useState('');

    // Formulario de nueva solicitud
    const [newRequest, setNewRequest] = useState({ type: 'Estandar', location: '' });

    useEffect(() => {
        const fetchHistory = async () => {
            const { data } = await supabase.from('completed_services').select('*').order('id', { ascending: false }).limit(100);
            if (data) setCompletedServices(data);
        };
        fetchHistory();

        // Real-time updates to history
        const channel = supabase.channel('admin-history')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'completed_services' }, (payload) => {
                setCompletedServices(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

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
    const occupiedDrivers = drivers.filter(d => d.status === 'Ocupado' || d.status === 'En Servicio');
    const inServiceDrivers = drivers.filter(d => d.status === 'En Servicio');

    const filteredHistory = completedServices
        .filter(s => !filterDriver || s.driver_name === filterDriver)
        .filter(s => !filterType || s.type === filterType);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Tarjetas de Estadisticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                {[
                    { label: 'Disponibles', value: activeDrivers.length, icon: <Users size={20} />, color: 'var(--success)' },
                    { label: 'En Servicio', value: inServiceDrivers.length, icon: <Truck size={20} />, color: 'var(--warning)' },
                    { label: 'Pendientes', value: serviceRequests.length, icon: <BellRing size={20} />, color: 'var(--accent-primary)' },
                    { label: 'Completados Hoy', value: completedServices.length, icon: <CheckCircle size={20} />, color: 'var(--accent-secondary)' },
                ].map((stat, i) => (
                    <div key={i} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '12px', background: `${stat.color}20` }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{stat.label}</p>
                            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
            {/* Sección Superior: Mapa, Solicitudes y Mensajería */}
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', animation: 'fadeIn 0.5s ease' }}>

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
                                        position={[driver.lat || 4.6097, driver.lng || -74.0817]}
                                        icon={L.divIcon({
                                            className: 'custom-leaflet-marker',
                                            html: `<div style="
                                            background: ${driver.status === 'Disponible' ? '#00b894' : driver.status === 'En Servicio' ? '#fdcb6e' : '#ff7675'};
                                            width: 16px; height: 16px; border-radius: 50%;
                                            box-shadow: 0 0 12px ${driver.status === 'Disponible' ? '#00b894' : driver.status === 'En Servicio' ? '#fdcb6e' : '#ff7675'};
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
                    <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>

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
                                                <h4 style={{ fontSize: '1.05rem' }}>{req.location.split('| GPS:')[0]}</h4>

                                                {req.location.includes('GPS: ') && (
                                                    <button
                                                        onClick={() => window.open(req.location.split('GPS: ')[1], '_blank')}
                                                        style={{
                                                            marginTop: '8px', padding: '4px 8px', fontSize: '0.8rem',
                                                            background: 'transparent', border: '1px solid var(--accent-secondary)',
                                                            color: 'var(--accent-secondary)', borderRadius: '6px', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500'
                                                        }}
                                                    >
                                                        <Navigation size={12} /> Ver Mapa
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <select
                                                    className="glass-input"
                                                    style={{ padding: '6px', fontSize: '0.8rem', maxWidth: '150px' }}
                                                    value={selectedDrivers[req.id] || ''}
                                                    onChange={(e) => setSelectedDrivers({ ...selectedDrivers, [req.id]: e.target.value })}
                                                >
                                                    <option value="" style={{ background: 'var(--bg-primary)' }}>Elegir...</option>
                                                    {activeDrivers.map(d => (
                                                        <option key={d.id} value={d.id} style={{ background: 'var(--bg-primary)' }}>{d.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    className="glass-button success"
                                                    style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                                                    onClick={async () => {
                                                        const driverId = selectedDrivers[req.id];
                                                        if (!driverId) return alert('Por favor selecciona un conductor de la lista.');

                                                        const driverToAssign = drivers.find(d => String(d.id) === String(driverId));
                                                        if (driverToAssign) {
                                                            // Actualizar el estado del conductor a 'En Servicio' en Supabase
                                                            const { error: statusError } = await supabase
                                                                .from('drivers')
                                                                .update({ status: 'En Servicio' })
                                                                .eq('id', driverToAssign.id);

                                                            if (statusError) {
                                                                console.error('Error updating status:', statusError);
                                                                alert(`Error al cambiar estado: ${statusError.message}`);
                                                                return;
                                                            }

                                                            // Enviar mensaje automático al conductor en Supabase
                                                            await supabase
                                                                .from('messages')
                                                                .insert([{
                                                                    text: `🚨 ¡NUEVO SERVICIO ASIGNADO! 🚨\nRecogida: ${req.location}\nServicio: ${req.type}\nHora: ${req.time}`,
                                                                    sender: "Administrador",
                                                                    recipient: driverToAssign.name,
                                                                    time: new Date().toLocaleTimeString()
                                                                }]);

                                                            // Extraer posible nombre de cliente
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
                                                                    driver_name: driverToAssign.name,
                                                                    accepted_time: new Date().toLocaleTimeString(),
                                                                    start_timestamp: new Date().toISOString()
                                                                }]);

                                                            // Eliminar la solicitud asignada
                                                            await supabase
                                                                .from('service_requests')
                                                                .delete()
                                                                .eq('id', req.id);

                                                            // Notificar al cliente si existe
                                                            if (clientName) {
                                                                await supabase.from('messages').insert([{
                                                                    text: `🚗 ¡CONDUCTOR ASIGNADO!\nConductor: ${driverToAssign.name}\nPlaca: ${driverToAssign.vehicle}`,
                                                                    sender: "Sistema",
                                                                    recipient: clientName,
                                                                    time: new Date().toLocaleTimeString()
                                                                }]);
                                                            }

                                                            alert(`Servicio asignado a: ${driverToAssign.name}`);
                                                        }
                                                    }}
                                                >
                                                    <CheckCircle size={16} /> Asignar
                                                </button>
                                            </div>
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
                                <p style={{ fontSize: '0.95rem', marginBottom: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</p>
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

            {/* Historial de Servicios con Filtros */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Filter size={20} color="var(--accent-primary)" />
                        Historial de Servicios
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{filteredHistory.length} registros</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select
                            className="glass-input"
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            value={filterDriver}
                            onChange={e => setFilterDriver(e.target.value)}
                        >
                            <option value="">Todos los conductores</option>
                            {[...new Set(completedServices.map(s => s.driver_name))].map(name => (
                                <option key={name} value={name} style={{ background: 'var(--bg-primary)' }}>{name}</option>
                            ))}
                        </select>
                        <select
                            className="glass-input"
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="">Todos los tipos</option>
                            <option value="Estandar" style={{ background: 'var(--bg-primary)' }}>Estándar</option>
                            <option value="VIP" style={{ background: 'var(--bg-primary)' }}>VIP</option>
                            <option value="Carga" style={{ background: 'var(--bg-primary)' }}>Carga / Mensajería</option>
                        </select>
                    </div>
                </div>

                {filteredHistory.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>No hay servicios completados aún.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 12px' }}>Tipo</th>
                                    <th style={{ padding: '10px 12px' }}>Conductor</th>
                                    <th style={{ padding: '10px 12px' }}>Recogida</th>
                                    <th style={{ padding: '10px 12px' }}>Hora</th>
                                    <th style={{ padding: '10px 12px' }}>Duración</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistory.map((svc, i) => (
                                    <tr key={svc.id || i} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                                    }}>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{ background: 'var(--accent-gradient)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{svc.type}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{svc.driver_name}</td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', maxWidth: '260px' }}>
                                            {svc.location?.split('| GPS:')[0]}
                                            {svc.location?.includes('GPS: ') && (
                                                <a href={svc.location.split('GPS: ')[1]} target="_blank" rel="noreferrer" title="Ver en mapa" style={{ marginLeft: '8px', color: 'var(--accent-secondary)' }}>
                                                    <Navigation size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                                </a>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{svc.accepted_time}</td>
                                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                            {svc.duration
                                                ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>⏱ {svc.duration}</span>
                                                : <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>En curso...</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Registro Global de Pasajeros */}
            <div className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                <h2 className="page-title" style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Registro Global de Pasajeros</h2>
                <PassengerRegistration currentUser={currentUser} />
            </div>

        </div>
    );
}
