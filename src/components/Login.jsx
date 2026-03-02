import { useState } from 'react';
import { Lock, User, LogIn, BellRing, CarFront, UserPlus } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login({ onLogin, drivers, setDrivers }) {
    const [role, setRole] = useState('driver'); // 'driver' o 'admin'
    const [isRegistering, setIsRegistering] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);

    // States para Login/Registro
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [vehicle, setVehicle] = useState('');

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const requestNotificationPermission = () => {
        if ('Notification' in window) {
            window.Notification.requestPermission();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (role === 'admin') {
            if (password === 'S@lomon0212') {
                requestNotificationPermission();
                onLogin({ role: 'admin', name: 'Administrador' });
            } else {
                setError('Contraseña de administrador incorrecta.');
            }
            return;
        }

        // Lógica para Conductor
        if (isRegistering) {
            // Registro de Conductor en Supabase
            if (!username || !password || !vehicle) {
                setError('Por favor completa todos los campos.');
                return;
            }

            const { data: existingDriver } = await supabase
                .from('drivers')
                .select('*')
                .eq('username', username)
                .single();

            if (existingDriver) {
                setError('Este usuario ya está registrado.');
                return;
            }

            const { error: insertError } = await supabase
                .from('drivers')
                .insert([{
                    name: username,
                    username: username,
                    password: password,
                    vehicle: vehicle,
                    status: 'Disponible'
                }]);

            if (insertError) {
                setError('Error al registrar en la base de datos.');
                return;
            }

            setSuccessMsg('Registro exitoso. Ahora puedes iniciar sesión.');
            setIsRegistering(false);
            setPassword('');
            setVehicle('');

        } else {
            // Login de Conductor
            if (!username || !password) {
                setError('Ingresa usuario y contraseña.');
                return;
            }

            const { data: driver, error: loginError } = await supabase
                .from('drivers')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (loginError) {
                console.error("Supabase Login Error:", loginError);
            }

            if (driver) {
                requestNotificationPermission();
                onLogin({ role: 'driver', name: driver.name, id: driver.id });
            } else {
                setError(`Usuario o contraseña incorrectos. Detalles: ${loginError ? loginError.message : 'No data'}`);
            }
        }
    };

    const handleRecovery = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!username) {
            setError('Por favor, ingresa tu usuario para recuperar la contraseña.');
            return;
        }

        const { data: driver } = await supabase
            .from('drivers')
            .select('*')
            .eq('username', username)
            .single();

        if (!driver) {
            setError('No se encontró ningún usuario con ese nombre.');
            return;
        }

        // Simular recuperación: Generar contraseña temporal y guardarla
        const tempPassword = Math.random().toString(36).slice(-8);

        await supabase
            .from('drivers')
            .update({ password: tempPassword })
            .eq('id', driver.id);

        setSuccessMsg(`¡Recuperación exitosa! Tu nueva contraseña temporal es: ${tempPassword}. Por favor, inicie sesión con ella.`);
        setPassword(tempPassword);
        setIsRecovering(false);
    };

    return (
        <div style={{
            width: '100vw', height: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '100%', maxWidth: '400px',
                padding: '32px',
                display: 'flex', flexDirection: 'column', gap: '24px'
            }}>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        background: 'var(--accent-gradient)',
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 32px rgba(108, 92, 231, 0.4)'
                    }}>
                        <BellRing size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>TransAvanza</h1>
                </div>

                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '4px' }}>
                    <button
                        style={{
                            flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                            background: role === 'driver' ? 'var(--accent-gradient)' : 'transparent',
                            color: role === 'driver' ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.3s ease', cursor: 'pointer', fontWeight: 500
                        }}
                        onClick={() => { setRole('driver'); setIsRegistering(false); setError(''); setSuccessMsg(''); }}
                    >
                        Conductor
                    </button>
                    <button
                        style={{
                            flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                            background: role === 'admin' ? 'var(--accent-gradient)' : 'transparent',
                            color: role === 'admin' ? 'white' : 'var(--text-secondary)',
                            transition: 'all 0.3s ease', cursor: 'pointer', fontWeight: 500
                        }}
                        onClick={() => { setRole('admin'); setIsRegistering(false); setError(''); setSuccessMsg(''); }}
                    >
                        Administrador
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {error && (
                        <div className="animate-fade-in" style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(255,118,117,0.1)', padding: '8px', borderRadius: '8px' }}>
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="animate-fade-in" style={{ color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(0,184,148,0.1)', padding: '8px', borderRadius: '8px', wordBreak: 'break-all' }}>
                            {successMsg}
                        </div>
                    )}

                    {role === 'driver' && (
                        <div className="input-group">
                            <label>Usuario</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                    <User size={18} />
                                </span>
                                <input
                                    type="text"
                                    className="glass-input"
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="Ej. juanperez"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {role === 'driver' && isRegistering && !isRecovering && (
                        <div className="input-group animate-fade-in">
                            <label>Placa del Vehículo</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                    <CarFront size={18} />
                                </span>
                                <input
                                    type="text"
                                    className="glass-input"
                                    style={{ paddingLeft: '40px', textTransform: 'uppercase' }}
                                    placeholder="Ej. ABC-123"
                                    value={vehicle}
                                    onChange={(e) => setVehicle(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {!isRecovering && (
                        <div className="input-group">
                            <label>{role === 'admin' ? 'Contraseña Maestra' : 'Contraseña'}</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                    <Lock size={18} />
                                </span>
                                <input
                                    type="password"
                                    className="glass-input"
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {isRecovering ? (
                        <button type="button" onClick={handleRecovery} className="glass-button primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem', marginTop: '8px' }}>
                            <Lock size={20} /> Recuperar Contraseña
                        </button>
                    ) : (
                        <button type="submit" className="glass-button primary" style={{ width: '100%', padding: '14px', fontSize: '1.1rem', marginTop: '8px' }}>
                            {role === 'driver' && isRegistering ? <><UserPlus size={20} /> Registrarse</> : <><LogIn size={20} /> Entrar</>}
                        </button>
                    )}
                </form>

                {role === 'driver' && !isRecovering && (
                    <div style={{ textAlign: 'center', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegistering(!isRegistering);
                                setError('');
                                setSuccessMsg('');
                            }}
                            style={{
                                background: 'none', border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer', fontSize: '0.9rem',
                                textDecoration: 'underline'
                            }}
                        >
                            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                        </button>
                        {!isRegistering && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsRecovering(true);
                                    setError('');
                                    setSuccessMsg('');
                                }}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--accent-secondary)',
                                    cursor: 'pointer', fontSize: '0.85rem'
                                }}
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        )}
                    </div>
                )}

                {isRecovering && (
                    <div style={{ textAlign: 'center', marginTop: '8px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsRecovering(false);
                                setError('');
                                setSuccessMsg('');
                            }}
                            style={{
                                background: 'none', border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer', fontSize: '0.9rem',
                                textDecoration: 'underline'
                            }}
                        >
                            Volver al inicio de sesión
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
