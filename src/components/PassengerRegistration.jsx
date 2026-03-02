import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Download } from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

export default function PassengerRegistration({ currentUser }) {
    const [passengers, setPassengers] = useState([]);
    const [newPassenger, setNewPassenger] = useState({
        nombres: '',
        apellidos: '',
        cc: '',
        destino: ''
    });
    const [notification, setNotification] = useState(null);

    // Fetch inicial y Suscripción
    useEffect(() => {
        const fetchPassengers = async () => {
            const { data } = await supabase
                .from('passengers')
                .select('*')
                .order('created_at', { ascending: false });
            if (data) setPassengers(data);
        };
        fetchPassengers();

        const channel = supabase.channel('passengers-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'passengers' }, payload => {
                fetchPassengers();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newPassenger.nombres || !newPassenger.cc) return;

        // Insert into Supabase
        const { error } = await supabase.from('passengers').insert([{
            nombres: newPassenger.nombres,
            apellidos: newPassenger.apellidos,
            cc: newPassenger.cc,
            destino: newPassenger.destino,
            driver_name: currentUser?.name || 'Admin',
            timestamp: new Date().toLocaleTimeString()
        }]);

        if (error) {
            console.error(error);
            alert("Error al guardar pasajero");
            return;
        }

        setNewPassenger({ nombres: '', apellidos: '', cc: '', destino: '' });

        setNotification('Pasajero registrado exitosamente');
        setTimeout(() => setNotification(null), 3000);
    };

    const exportToExcel = () => {
        if (passengers.length === 0) return alert("No hay datos para exportar");

        // Prepare simplified data for excel
        const excelData = passengers.map(p => ({
            "Fecha/Hora": new Date(p.created_at || Date.now()).toLocaleString(),
            "Nombres": p.nombres,
            "Apellidos": p.apellidos,
            "Cédula": p.cc,
            "Destino": p.destino,
            "Conductor": p.driver_name
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pasajeros");
        XLSX.writeFile(workbook, `Registro_Pasajeros_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>

            {/* Formulario de Registro */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserPlus size={20} color="var(--accent-primary)" />
                    Nuevo Registro
                </h3>

                {notification && (
                    <div className="animate-fade-in" style={{
                        background: 'rgba(0, 184, 148, 0.1)',
                        border: '1px solid var(--success)',
                        color: 'var(--success)',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <UserCheck size={16} />
                        {notification}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Nombres</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newPassenger.nombres}
                            onChange={e => setNewPassenger({ ...newPassenger, nombres: e.target.value })}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Apellidos</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newPassenger.apellidos}
                            onChange={e => setNewPassenger({ ...newPassenger, apellidos: e.target.value })}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Cédula de Ciudadanía (CC)</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newPassenger.cc}
                            onChange={e => setNewPassenger({ ...newPassenger, cc: e.target.value })}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Destino</label>
                        <input
                            type="text"
                            className="glass-input"
                            value={newPassenger.destino}
                            onChange={e => setNewPassenger({ ...newPassenger, destino: e.target.value })}
                            required
                        />
                    </div>
                    <button type="submit" className="glass-button primary" style={{ width: '100%', marginTop: '16px' }}>
                        Registrar Pasajero
                    </button>
                </form>
            </div>

            {/* Lista de Registros */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3>Pasajeros Transportados Hoy</h3>
                        <span style={{ background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Total: {passengers.length}
                        </span>
                    </div>
                    <button onClick={exportToExcel} className="glass-button success" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                        <Download size={16} /> Descargar Excel
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Hora</th>
                                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Pasajero</th>
                                <th style={{ padding: '12px 16px', fontWeight: 500 }}>CC</th>
                                <th style={{ padding: '12px 16px', fontWeight: 500 }}>Destino</th>
                            </tr>
                        </thead>
                        <tbody>
                            {passengers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                        No hay registros de pasajeros aún.
                                    </td>
                                </tr>
                            ) : (
                                passengers.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.3s ease' }} className="animate-fade-in">
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{p.timestamp}</td>
                                        <td style={{ padding: '16px', fontWeight: 500 }}>{p.nombres} {p.apellidos}</td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{p.cc}</td>
                                        <td style={{ padding: '16px', color: 'var(--accent-secondary)' }}>{p.destino}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
