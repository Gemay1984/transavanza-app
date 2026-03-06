import { useState, useEffect } from 'react';
import {
  Users, MapPin, LayoutDashboard, Settings, Navigation, Bell, UserPlus, CarTaxiFront, LogOut
} from 'lucide-react';
import { supabase } from './supabaseClient';
import './App.css';

import AdminDashboard from './components/AdminDashboard';
import DriverManagement from './components/DriverManagement';
import PassengerRegistration from './components/PassengerRegistration';
import CustomerDashboard from './components/CustomerDashboard';
import Login from './components/Login';
import AdminDriverList from './components/AdminDriverList';

// Hook para localStorage
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

// Componente App Principal
function App() {
  const [user, setUser] = useLocalStorage('lamala_user', null);

  // Si es conductor, forzarlo a la pestaña 'drivers' o 'passengers'
  // Si es cliente, su pestaña será 'customer'
  const getInitialTab = (role) => {
    if (role === 'admin') return 'dashboard';
    if (role === 'customer') return 'customer';
    return 'drivers';
  };
  const [activeTab, setActiveTab] = useState(user ? getInitialTab(user.role) : 'drivers');

  // Estado que ahora será manejado por Supabase
  const [drivers, setDrivers] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [messages, setMessages] = useState([]);

  const [messagesCount, setMessagesCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);

  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      // Get Drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*');

      if (driversError) {
        console.error("Error fetching drivers:", driversError);
      } else {
        setDrivers(driversData || []);
      }

      // Get Messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
      } else {
        setMessages(messagesData || []);
        setMessagesCount((messagesData || []).length);
      }

      // Get Service Requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select('*');

      if (requestsError) {
        console.error("Error fetching requests:", requestsError);
      } else {
        setServiceRequests(requestsData || []);
        // Only update count on initial load or if we want to avoid triggering alarms on load
        setRequestsCount(prev => prev === 0 && (requestsData || []).length > 0 ? (requestsData || []).length : prev);
      }
    };

    fetchData();

    // Supabase Realtime Subscriptions
    const driversChannel = supabase.channel('table-drivers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, payload => {
        fetchData(); // Simplest approach: refetch on change
      })
      .subscribe();

    const messagesChannel = supabase.channel('table-messages-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    const requestsChannel = supabase.channel('table-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, payload => {
        if (payload.event === 'INSERT') {
          setServiceRequests(prev => [...prev, payload.new]);
        } else {
          fetchData();
        }
      })
      .subscribe();

    window.addEventListener('focus', fetchData);

    return () => {
      supabase.removeChannel(driversChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(requestsChannel);
      window.removeEventListener('focus', fetchData);
    };
  }, []);

  // Reproducir sonido de notificación cuando hay mensajes nuevos
  useEffect(() => {
    if (messages.length > messagesCount) {
      if (messagesCount > 0) { // Evita sonar al inicio
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Tono alto (A5)
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volumen suave

          oscillator.start();
          gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5); // Fade out rápido
          oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
          console.log("Audio de notificación bloqueado por el navegador", e);
        }
      }
      setMessagesCount(messages.length);
    }
  }, [messages, messagesCount]);

  // Reproducir alarma fuerte para nuevos servicios pending
  useEffect(() => {
    if (serviceRequests.length > requestsCount) {
      if (requestsCount > 0 || serviceRequests.length === 1) { // Evita sonar en carga masiva, suena si hay 1 y antes 0
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

          const playBeep = (freq, time, duration) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'square'; // Más notorio
            oscillator.frequency.setValueAtTime(freq, time);
            gainNode.gain.setValueAtTime(0.15, time); // Un poco más fuerte
            oscillator.start(time);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, time + duration);
            oscillator.stop(time + duration);
          };

          const now = audioCtx.currentTime;
          playBeep(1000, now, 0.15);
          playBeep(1200, now + 0.25, 0.15);
          playBeep(1000, now + 0.5, 0.25);

        } catch (e) {
          console.log("Audio de alerta bloqueado", e);
        }
      }
      setRequestsCount(serviceRequests.length);
    }
  }, [serviceRequests, requestsCount]);

  // Sincronizar tab si cambia el usuario
  useEffect(() => {
    if (user) {
      setActiveTab(getInitialTab(user.role));
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} drivers={drivers} />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <Navigation size={24} />
          </div>
          <div className="logo-text">
            <h1>TransAvanza</h1>
          </div>
        </div>

        <nav className="nav-links">
          {user.role === 'customer' ? (
            <button
              className={`nav-item ${activeTab === 'customer' ? 'active' : ''}`}
              onClick={() => setActiveTab('customer')}
            >
              <MapPin size={20} /> Pedir Servicio
            </button>
          ) : (
            <>
              {isAdmin && (
                <>
                  <button
                    className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    <LayoutDashboard size={20} /> Tablero Admin
                  </button>
                  <button
                    className={`nav-item ${activeTab === 'admin-drivers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admin-drivers')}
                  >
                    <Users size={20} /> Conductores
                  </button>
                </>
              )}
              <button
                className={`nav-item ${activeTab === 'drivers' ? 'active' : ''}`}
                onClick={() => setActiveTab('drivers')}
              >
                <CarTaxiFront size={20} /> {isAdmin ? "Flota / Nuevo" : "Mi Estado GPS"}
              </button>
              <button
                className={`nav-item ${activeTab === 'passengers' ? 'active' : ''}`}
                onClick={() => setActiveTab('passengers')}
              >
                <Users size={20} /> Registro Pasajeros
              </button>
            </>
          )}
        </nav>

        {/* User profile / Logout at bottom */}
        <div style={{ marginTop: 'auto', padding: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Logueado como:</p>
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name}</p>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' && isAdmin && (
          <div className="animate-fade-in">
            <div className="page-header">
              <div>
                <h2 className="page-title">Tablero de Control</h2>
                <p className="page-subtitle">Monitoreo y asignación desde central</p>
              </div>
            </div>
            <AdminDashboard
              drivers={drivers}
              setDrivers={setDrivers}
              serviceRequests={serviceRequests}
              setServiceRequests={setServiceRequests}
              messages={messages}
              setMessages={setMessages}
              currentUser={user}
            />
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="animate-fade-in">
            <div className="page-header">
              <div>
                <h2 className="page-title">{isAdmin ? "Gestión de Conductores" : "Mi Estado de Operación"}</h2>
                <p className="page-subtitle">Activación de ubicación y disponibilidad</p>
              </div>
            </div>
            <DriverManagement
              drivers={drivers}
              setDrivers={setDrivers}
              currentUser={user}
              isAdmin={isAdmin}
              serviceRequests={serviceRequests}
              setServiceRequests={setServiceRequests}
              messages={messages}
              setMessages={setMessages}
            />
          </div>
        )}

        {activeTab === 'admin-drivers' && isAdmin && (
          <div className="animate-fade-in">
            <div className="page-header">
              <div>
                <h2 className="page-title">Directorio de Conductores</h2>
                <p className="page-subtitle">Gestión centralizada de credenciales y accesos</p>
              </div>
            </div>
            <AdminDriverList drivers={drivers} setDrivers={setDrivers} />
          </div>
        )}

        {activeTab === 'passengers' && user.role !== 'customer' && (
          <div className="animate-fade-in">
            <div className="page-header">
              <div>
                <h2 className="page-title">Registro de Pasajeros</h2>
                <p className="page-subtitle">Información centralizada de clientes y destinos</p>
              </div>
            </div>
            <PassengerRegistration currentUser={user} />
          </div>
        )}

        {activeTab === 'customer' && (
          <CustomerDashboard currentUser={user} serviceRequests={serviceRequests} messages={messages} />
        )}

      </main>
    </div>
  );
}

export default App;
