import { useState } from 'react';
import { MapPin, Navigation2, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function CustomerDashboard({ currentUser, serviceRequests, messages = [] }) {
    const [requestForm, setRequestForm] = useState({
        type: 'Estandar',
        location: '',
        destination: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if the user has an active request
    // We assume the service_requests table might not have a full relation to a 'customers' table right now,
    // so we can match by checking if the location or some metadata contains their name.
    // However, since we define 'customer' role simply by name/phone in Login, 
    // let's just show their pending requests based on a simplified logic or assuming they just submitted one.

    // For a simple PoC, we let them submit a request which includes their name in the location or as a note
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!requestForm.location) return;

        setIsSubmitting(true);

        const fullLocation = `${requestForm.location} ${requestForm.destination ? `-> ${requestForm.destination}` : ''} (Ref: ${currentUser.name} - ${currentUser.phone || 'Sin tel.'})`;

        const { error } = await supabase.from('service_requests').insert([{
            type: requestForm.type,
            location: fullLocation,
            status: 'pending',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        setIsSubmitting(false);

        if (error) {
            alert('Hubo un error al solicitar el servicio. Intenta de nuevo.');
        } else {
            console.log("Servicio solicitado excitósamente");
            setRequestForm({ type: 'Estandar', location: '', destination: '' });
            alert('¡Servicio solicitado exitosamente! Un conductor te será asignado pronto.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
            <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.4rem' }}>
                    <Navigation2 size={28} color="var(--accent-primary)" />
                    Pedir un Transporte
                </h3>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
                    Hola, {currentUser.name}. Completa los detalles a continuación y enviaremos tu solicitud a la red de conductores.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    <div className="input-group">
                        <label>Tipo de Transporte</label>
                        <select
                            className="glass-input"
                            value={requestForm.type}
                            onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                            required
                        >
                            <option value="Estandar" style={{ background: 'var(--bg-primary)' }}>Vehículo Estándar</option>
                            <option value="VIP" style={{ background: 'var(--bg-primary)' }}>Servicio VIP</option>
                            <option value="Carga" style={{ background: 'var(--bg-primary)' }}>Mensajería / Carga</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Punto de Recogida</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-secondary)' }}>
                                <MapPin size={18} />
                            </span>
                            <input
                                type="text"
                                className="glass-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="Ej: Calle Principal 123"
                                value={requestForm.location}
                                onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Destino (Opcional)</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                <CheckCircle size={18} />
                            </span>
                            <input
                                type="text"
                                className="glass-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="Ej: Centro Comercial Norte"
                                value={requestForm.destination}
                                onChange={(e) => setRequestForm({ ...requestForm, destination: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="glass-button primary"
                        style={{ marginTop: '12px', padding: '16px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>Procesando...</>
                        ) : (
                            <>
                                <Navigation2 size={20} /> Solicitar Ahora
                            </>
                        )}
                    </button>

                </form>
            </div>

            {/* Mensajes y Notificaciones Recientes */}
            <div className="glass-panel" style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)' }}>
                    <CheckCircle size={16} /> Notificaciones
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {messages.filter(msg => msg.recipient === currentUser.name).length === 0 ? (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>
                            Sin notificaciones recientes.
                        </p>
                    ) : (
                        messages.filter(msg => msg.recipient === currentUser.name).slice(-3).map(msg => (
                            <div key={msg.id} style={{
                                padding: '16px', borderRadius: '8px',
                                border: '1px solid var(--success)',
                                background: 'rgba(0,184,148,0.1)'
                            }}>
                                <p style={{ fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>{msg.time}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Historial o Estado Reciente Simulado */}
            <div className="glass-panel" style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Clock size={16} /> Tus solicitudes activas
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {serviceRequests.filter(req => req.location.includes(currentUser.name)).length === 0 ? (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>
                            No tienes viajes en curso.
                        </p>
                    ) : (
                        serviceRequests.filter(req => req.location.includes(currentUser.name)).map(req => (
                            <div key={req.id} style={{
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid var(--accent-secondary)',
                                background: 'rgba(0, 184, 148, 0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>EN COLA DE ASIGNACIÓN</span>
                                    <p style={{ marginTop: '4px', fontWeight: 500 }}>{req.type}</p>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{req.time}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}
