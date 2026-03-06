import React, { useState } from 'react';
import { MapPin, Trash2, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';

const AdminDriverList = ({ drivers, setDrivers }) => {

    const handleDelete = async (driver) => {
        if (window.confirm(`¿Estás seguro de eliminar permanentemente al conductor ${driver.name}?`)) {
            const { error } = await supabase.from('drivers').delete().eq('id', driver.id);
            if (error) {
                alert('Error al eliminar: ' + error.message);
            } else {
                if (setDrivers) {
                    setDrivers(prev => prev.filter(d => d.id !== driver.id));
                }
                alert('Conductor eliminado exitosamente.');
            }
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const { error } = await supabase
                .from('drivers')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar estado.');
        }
    };

    return (
        <div style={{ padding: '24px' }} className="glass-panel animate-fade-in">
            <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={24} color="var(--accent-primary)" />
                Directorio Completo de Conductores
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
                {drivers.map(driver => (
                    <div key={driver.id} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '12px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{driver.name}</h4>
                                <div style={{ display: 'flex', gap: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={16} color={
                                            driver.status === 'Disponible' ? "var(--accent-secondary)" :
                                                driver.status === 'En Servicio' ? "var(--warning)" : "var(--danger)"
                                        } />
                                        {driver.status}
                                    </span>
                                    <span><strong>Usuario:</strong> {driver.username}</span>
                                    <span><strong>Placa:</strong> {driver.vehicle}</span>
                                    <span><strong>Teléfono:</strong> {driver.phone || 'N/A'}</span>
                                    <span>
                                        <strong>Contraseña:</strong>{' '}
                                        <span style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', letterSpacing: '1px', color: '#fff' }}>
                                            {driver.password || 'No registrada'}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <select
                                    className="glass-input"
                                    value={driver.status}
                                    onChange={(e) => updateStatus(driver.id, e.target.value)}
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

                                <button
                                    onClick={() => handleDelete(driver)}
                                    style={{
                                        background: 'rgba(255,118,117,0.1)',
                                        border: '1px solid var(--danger)',
                                        color: 'var(--danger)',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,118,117,0.2)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,118,117,0.1)'}
                                    title="Eliminar Conductor Permanentemente"
                                >
                                    <Trash2 size={18} /> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {drivers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No hay conductores registrados en el sistema.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDriverList;
