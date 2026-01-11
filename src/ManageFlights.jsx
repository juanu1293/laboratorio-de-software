import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const ManageFlights = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("view");
  const [flights, setFlights] = useState([]);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [flightsPerPage] = useState(10);

  // Estados para el formulario de crear vuelo
  const [flightForm, setFlightForm] = useState({
    origen: "",
    destino: "",
    fecha_salida: "",
    hora_salida: "",
    fecha_llegada: "",
    hora_llegada: "",
    costo_economico: "",
    costo_vip: "",
  });

  // ESTADOS PARA EDICIÓN
  const [editingFlight, setEditingFlight] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [canEditDates, setCanEditDates] = useState(true);
  const [editForm, setEditForm] = useState({
    costo_economico: "",
    costo_vip: "",
    fecha_salida: "",
    hora_salida: "",
    estado: "Activo",
  });

  // Lista de ciudades disponibles
  const cities = [
    "Arauca",
    "Armenia",
    "Barranquilla",
    "Bogotá",
    "Bucaramanga",
    "Cali",
    "Cartagena",
    "Cúcuta",
    "Florencia",
    "Ibagué",
    "Leticia",
    "Manizales",
    "Medellín",
    "Mitú",
    "Mocoa",
    "Montería",
    "Neiva",
    "Pasto",
    "Pereira",
    "Popayán",
    "Puerto Carreño",
    "Quibdó",
    "Riohacha",
    "San Andrés",
    "San José del Guaviare",
    "Santa Marta",
    "Sincelejo",
    "Tunja",
    "Valledupar",
    "Villavicencio",
    "Yopal",
    "🌍 Ciudades Internacionales",
    "Buenos Aires",
    "Londres",
    "Madrid",
    "Miami",
    "New York",
  ];

  // Lista de ciudades colombianas
  const colombianCities = [
    "Arauca",
    "Armenia",
    "Barranquilla",
    "Bogotá",
    "Bucaramanga",
    "Cali",
    "Cartagena",
    "Cúcuta",
    "Florencia",
    "Ibagué",
    "Leticia",
    "Manizales",
    "Medellín",
    "Mitú",
    "Mocoa",
    "Montería",
    "Neiva",
    "Pasto",
    "Pereira",
    "Popayán",
    "Puerto Carreño",
    "Quibdó",
    "Riohacha",
    "San Andrés",
    "San José del Guaviare",
    "Santa Marta",
    "Sincelejo",
    "Tunja",
    "Valledupar",
    "Villavicencio",
    "Yopal",
  ];

  // Lista de ciudades internacionales
  const internationalCities = [
    "🌍 Ciudades Internacionales",
    "Buenos Aires",
    "Londres",
    "Madrid",
    "Miami",
    "New York",
  ];

  // Ciudades colombianas que tienen vuelos internacionales
  const colombianCitiesWithInternationalFlights = [
    "Bogotá",
    "Medellín",
    "Cali",
    "Cartagena",
    "Pereira",
  ];

  // Ciudades colombianas que SOLO tienen vuelos nacionales
  const colombianCitiesOnlyNational = colombianCities.filter(
    (city) => !colombianCitiesWithInternationalFlights.includes(city)
  );

  // Cargar vuelos desde el backend
  useEffect(() => {
    fetchFlights();
    checkAuthAndPermissions();
  }, []);

  const fetchFlights = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/flights");
      const data = await response.json();

      const realFlights = data.map((dbFlight) => ({
        id: dbFlight.id_vuelo,
        id_vuelo: dbFlight.id_vuelo,
        flightNumber: `VS${String(dbFlight.id_vuelo).padStart(3, "0")}`,
        route: `${dbFlight.origen} → ${dbFlight.destino}`,
        origin: dbFlight.origen,
        destination: dbFlight.destino,
        schedule: `${dbFlight.hora_salida.substring(0, 5)} - ${
          dbFlight.hora_llegada ? dbFlight.hora_llegada.substring(0, 5) : "?"
        }`,
        fecha_salida: dbFlight.fecha_salida.split("T")[0],
        hora_salida: dbFlight.hora_salida,
        hora_llegada: dbFlight.hora_llegada,
        price: Number(dbFlight.costo_economico),
        costo_economico: Number(dbFlight.costo_economico),
        costo_vip: Number(dbFlight.costo_vip),
        status: dbFlight.estado || "Activo",
        tipo_vuelo: dbFlight.tipo_vuelo,
      }));

      setFlights(realFlights);
    } catch (error) {
      console.error("Error cargando vuelos:", error);
    }
  };

  // Obtener vuelos paginados
  const getPaginatedFlights = () => {
    const indexOfLastFlight = currentPage * flightsPerPage;
    const indexOfFirstFlight = indexOfLastFlight - flightsPerPage;
    return flights.slice(indexOfFirstFlight, indexOfLastFlight);
  };

  // Función para cambiar de página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Calcular el total de páginas
  const totalPages = Math.ceil(flights.length / flightsPerPage);

  // Función para generar números de página
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  // Obtener ciudades destino disponibles según el origen seleccionado
  const getAvailableDestinations = (origenSeleccionado) => {
    if (!origenSeleccionado) return cities;

    const esOrigenColombianoPrincipal =
      colombianCitiesWithInternationalFlights.includes(origenSeleccionado);
    const esOrigenColombianoSoloNacional =
      colombianCitiesOnlyNational.includes(origenSeleccionado);
    const esOrigenInternacional =
      internationalCities.includes(origenSeleccionado);

    if (esOrigenColombianoPrincipal) {
      return [...colombianCities, ...internationalCities];
    } else if (esOrigenColombianoSoloNacional) {
      return colombianCities;
    } else if (esOrigenInternacional) {
      return colombianCitiesWithInternationalFlights;
    }

    return cities;
  };

  // Obtener ciudades origen disponibles según el destino seleccionado
  const getAvailableOrigins = (destinoSeleccionado) => {
    if (!destinoSeleccionado) return cities;

    const esDestinoColombianoPrincipal =
      colombianCitiesWithInternationalFlights.includes(destinoSeleccionado);
    const esDestinoColombianoSoloNacional =
      colombianCitiesOnlyNational.includes(destinoSeleccionado);
    const esDestinoInternacional =
      internationalCities.includes(destinoSeleccionado);

    if (esDestinoColombianoPrincipal) {
      return [...colombianCities, ...internationalCities];
    } else if (esDestinoColombianoSoloNacional) {
      return colombianCities;
    } else if (esDestinoInternacional) {
      return colombianCitiesWithInternationalFlights;
    }

    return cities;
  };

  // Manejar cambio de origen
  const handleOrigenChange = (origen) => {
    setFlightForm((prev) => {
      const nuevoForm = { ...prev, origen };

      const esOrigenColombianoSoloNacional =
        colombianCitiesOnlyNational.includes(origen);
      const esOrigenInternacional = internationalCities.includes(origen);

      if (
        esOrigenColombianoSoloNacional &&
        internationalCities.includes(prev.destino) &&
        prev.destino
      ) {
        nuevoForm.destino = "";
      }

      if (
        esOrigenInternacional &&
        !colombianCitiesWithInternationalFlights.includes(prev.destino) &&
        prev.destino
      ) {
        nuevoForm.destino = "";
      }

      return nuevoForm;
    });
  };

  // Manejar cambio de destino
  const handleDestinoChange = (destino) => {
    setFlightForm((prev) => {
      const nuevoForm = { ...prev, destino };

      const esDestinoColombianoSoloNacional =
        colombianCitiesOnlyNational.includes(destino);
      const esDestinoInternacional = internationalCities.includes(destino);

      if (
        esDestinoColombianoSoloNacional &&
        internationalCities.includes(prev.origen) &&
        prev.origen
      ) {
        nuevoForm.origen = "";
      }

      if (
        esDestinoInternacional &&
        !colombianCitiesWithInternationalFlights.includes(prev.origen) &&
        prev.origen
      ) {
        nuevoForm.origen = "";
      }

      return nuevoForm;
    });
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("🟡 INICIANDO ENVÍO DE FORMULARIO");

    // Validación básica
    if (
      !flightForm.origen ||
      !flightForm.destino ||
      !flightForm.fecha_salida ||
      !flightForm.hora_salida ||
      !flightForm.fecha_llegada ||
      !flightForm.hora_llegada ||
      !flightForm.costo_economico ||
      !flightForm.costo_vip
    ) {
      alert("⚠️ Por favor completa todos los campos obligatorios.");
      return;
    }

    // Verificar que la fecha de llegada sea posterior a la de salida
    if (flightForm.fecha_llegada < flightForm.fecha_salida) {
      alert("❌ La fecha de llegada debe ser posterior a la fecha de salida.");
      return;
    }

    // Verificar autenticación
    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    if (!authToken) {
      alert("❌ No estás autenticado. Por favor inicia sesión nuevamente.");
      navigate("/login");
      return;
    }

    try {
      // VUELO DE IDA: Origen → Destino
      const flightDataIda = {
        origen: flightForm.origen,
        destino: flightForm.destino,
        fecha_salida: flightForm.fecha_salida,
        hora_salida: flightForm.hora_salida,
        fecha_llegada: flightForm.fecha_salida,
        hora_llegada: flightForm.hora_salida,
        costo_economico: Number(flightForm.costo_economico),
        costo_vip: Number(flightForm.costo_vip),
        tipo_vuelo: "solo_ida",
      };

      console.log(
        "🛫 ENVIANDO VUELO DE IDA:",
        JSON.stringify(flightDataIda, null, 2)
      );

      const responseIda = await fetch("http://localhost:5000/api/flights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + authToken,
        },
        body: JSON.stringify(flightDataIda),
      });

      console.log("📨 Respuesta del servidor (Ida):", {
        status: responseIda.status,
        ok: responseIda.ok,
        statusText: responseIda.statusText,
      });

      if (!responseIda.ok) {
        let errorMessage = `Error ${responseIda.status}`;
        try {
          const errorData = await responseIda.json();
          errorMessage = errorData.mensaje || errorData.error || errorMessage;
          console.error("❌ Error detallado del servidor (Ida):", errorData);
        } catch (parseError) {
          console.error("❌ Error parseando respuesta de error:", parseError);
        }

        alert("❌ Error del servidor al crear vuelo de ida: " + errorMessage);
        return;
      }

      const dataIda = await responseIda.json();
      console.log("✅ Vuelo de ida creado exitosamente:", dataIda);

      // VUELO DE REGRESO: Destino → Origen
      const flightDataRegreso = {
        origen: flightForm.destino,
        destino: flightForm.origen,
        fecha_salida: flightForm.fecha_llegada,
        hora_salida: flightForm.hora_llegada,
        fecha_llegada: flightForm.fecha_llegada,
        hora_llegada: flightForm.hora_llegada,
        costo_economico: Number(flightForm.costo_economico),
        costo_vip: Number(flightForm.costo_vip),
        tipo_vuelo: "solo_ida",
      };

      console.log(
        "🛬 ENVIANDO VUELO DE REGRESO:",
        JSON.stringify(flightDataRegreso, null, 2)
      );

      const responseRegreso = await fetch("http://localhost:5000/api/flights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + authToken,
        },
        body: JSON.stringify(flightDataRegreso),
      });

      console.log("📨 Respuesta del servidor (Regreso):", {
        status: responseRegreso.status,
        ok: responseRegreso.ok,
        statusText: responseRegreso.statusText,
      });

      if (responseRegreso.ok) {
        const dataRegreso = await responseRegreso.json();
        console.log("✅ Vuelo de regreso creado exitosamente:", dataRegreso);
        alert("✅ Vuelo de ida y vuelta creados exitosamente");
      } else {
        let errorMessage = `Error ${responseRegreso.status}`;
        try {
          const errorData = await responseRegreso.json();
          errorMessage = errorData.mensaje || errorData.error || errorMessage;
          console.error(
            "❌ Error detallado del servidor (Regreso):",
            errorData
          );
        } catch (parseError) {
          console.error("❌ Error parseando respuesta de error:", parseError);
        }

        alert(
          "✅ Vuelo de ida creado exitosamente. ❌ Hubo un problema con el vuelo de regreso: " +
            errorMessage
        );
      }

      // Recargar la lista de vuelos
      fetchFlights();

      // Ir a la última página para ver los vuelos nuevos
      setCurrentPage(totalPages);

      // Limpiar formulario
      setFlightForm({
        origen: "",
        destino: "",
        fecha_salida: "",
        hora_salida: "",
        fecha_llegada: "",
        hora_llegada: "",
        costo_economico: "",
        costo_vip: "",
      });

      // Cambiar a la pestaña de ver vuelos
      setActiveTab("view");
    } catch (error) {
      console.error("❌ Error completo en handleSubmit:", error);
      alert("❌ Error de conexión con el servidor: " + error.message);
    }
  };

  // Verificar autenticación y permisos
  const checkAuthAndPermissions = () => {
    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const userData =
      localStorage.getItem("userData") || sessionStorage.getItem("userData");

    if (authToken && userData) {
      try {
        const user = JSON.parse(userData);
        const userRole = user.tipo_usuario || user.role || "Usuario";

        const allowedRoles = ["Administrador", "administrador"];

        if (!allowedRoles.includes(userRole)) {
          alert(
            `⛔ Acceso denegado. \n\nSolo los usuarios con rol "Administrador" pueden acceder a la gestión de vuelos.\n\nTu rol actual: ${userRole}`
          );
          navigate("/");
          return;
        }

        setUserInfo({
          nombre: user.nombre,
          correo: user.correo,
          role: userRole,
        });
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        handleLogout();
      }
    } else {
      navigate("/login");
    }
  };

  // Resetear a página 1 cuando cambia la pestaña
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");
    setUserInfo(null);
    setIsAdmin(false);
    alert("Has cerrado sesión exitosamente");
    navigate("/");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "origen") {
      handleOrigenChange(value);
    } else if (name === "destino") {
      handleDestinoChange(value);
    } else {
      setFlightForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Función para editar vuelo
  const handleEditClick = async (flight) => {
    console.log("📦 OBJETO VUELO COMPLETO:", flight);

    const flightId =
      flight.id_vuelo || flight.id || flight.flight_id || flight._id;
    console.log("🔎 ID DETECTADO:", flightId);

    if (!flightId) {
      alert("❌ ERROR CRÍTICO: No se encuentra el ID del vuelo en los datos.");
      return;
    }

    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (!authToken) {
      alert("⚠️ No hay sesión activa.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/flights/${flightId}/check-seats`,
        {
          headers: { Authorization: "Bearer " + authToken },
        }
      );

      let canEdit = true;
      let occupied = 0;

      if (response.ok) {
        const data = await response.json();
        canEdit = data.canEditSensitiveData;
        occupied = data.occupiedSeats;
      }

      setEditingFlight(flight);
      setCanEditDates(canEdit);

      setEditForm({
        costo_economico: flight.price || flight.costo_economico || "",
        costo_vip: flight.costo_vip || 0,
        fecha_salida: flight.fecha_salida || "",
        hora_salida: flight.hora_salida || "",
        estado: flight.status || flight.estado || "Activo",
      });

      setShowEditModal(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al verificar asientos, revisa la consola.");
    }
  };

  // Manejar cambios en el input del modal
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  // Guardar la edición
  const handleUpdateFlight = async (e) => {
    e.preventDefault();

    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (!authToken) {
      alert("⚠️ Error de sesión: No se encontró tu credencial de acceso.");
      return;
    }

    const flightId = editingFlight.id_vuelo;
    console.log("💾 Guardando en BD ID:", flightId);

    try {
      const response = await fetch(
        `http://localhost:5000/api/flights/${flightId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + authToken,
          },
          body: JSON.stringify(editForm),
        }
      );

      if (response.ok) {
        alert("✅ Vuelo actualizado correctamente.");
        fetchFlights(); // Recargar vuelos
        setShowEditModal(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(
          `❌ Error al actualizar: ${errorData.mensaje || "Error desconocido"}`
        );
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Error de conexión al intentar guardar.");
    }
  };

  // Componente del menú de usuario
  const UserMenu = ({ userInfo, onLogout }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
      <div className="user-menu-container">
        <button
          className="user-menu-trigger"
          onClick={() => setShowMenu(!showMenu)}
        >
          <div className="user-info">
            <span className="user-welcome">Hola, {userInfo.nombre}</span>
            <span className="user-role admin-role">{userInfo.role}</span>
          </div>
          <span>▼</span>
        </button>

        {showMenu && (
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <div className="user-welcome">{userInfo.nombre}</div>
              <div className="user-menu-email">{userInfo.correo}</div>
              <div className="user-role-badge admin-badge">{userInfo.role}</div>
            </div>

            <div className="user-menu-items">
              <div className="menu-section-title">Mi Cuenta</div>
              <button
                className="menu-item"
                onClick={() => navigate("/edit-profile")}
              >
                <span className="menu-icon">👤</span> Editar Perfil
              </button>

              <button
                className="menu-item"
                onClick={() => navigate("/change-password")}
              >
                <span className="menu-icon">🔒</span> Cambiar Contraseña
              </button>

              <div className="menu-divider"></div>

              <div className="menu-section-title">Administración</div>
              <button
                className="menu-item"
                onClick={() => navigate("/manage-flights")}
              >
                <span className="menu-icon">✈️</span> Gestionar Vuelos
              </button>

              <div className="menu-divider"></div>

              <button className="menu-item logout" onClick={onLogout}>
                <span className="menu-icon">🚪</span> Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleLogoClick = () => navigate("/");

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <div
            className="logo-container"
            onClick={handleLogoClick}
            style={{ cursor: "pointer" }}
          >
            <img
              src="https://i.pinimg.com/736x/60/48/b4/6048b4ae7f74724389d345767e8061a0.jpg"
              alt="VivaSky Logo"
              className="logo-image"
            />
            <span className="logo-text">VivaSky</span>
          </div>
          <button className="back-btn" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </header>
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="app">
        <header className="header">
          <div
            className="logo-container"
            onClick={handleLogoClick}
            style={{ cursor: "pointer" }}
          >
            <img
              src="https://i.pinimg.com/736x/60/48/b4/6048b4ae7f74724389d345767e8061a0.jpg"
              alt="VivaSky Logo"
              className="logo-image"
            />
            <span className="logo-text">VivaSky</span>
          </div>
          <button className="back-btn" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </header>
        <div className="error-container">
          <div className="error-icon">⛔</div>
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a esta página.</p>
          <button className="back-btn" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div
          className="logo-container"
          onClick={handleLogoClick}
          style={{ cursor: "pointer" }}
        >
          <img
            src="https://i.pinimg.com/736x/60/48/b4/6048b4ae7f74724389d345767e8061a0.jpg"
            alt="VivaSky Logo"
            className="logo-image"
          />
          <span className="logo-text">VivaSky</span>
        </div>

        {userInfo && <UserMenu userInfo={userInfo} onLogout={handleLogout} />}

        <button className="back-btn" onClick={() => navigate("/")}>
          Volver al inicio
        </button>
      </header>

      <div className="manage-flights-container">
        <div className="admin-header">
          <h1>🛠️ Gestión de Vuelos</h1>
          <p>Administra y gestiona todos los vuelos de VivaSky Airlines</p>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab-button ${
              activeTab === "view" ? "active" : ""
            }`}
            onClick={() => setActiveTab("view")}
          >
            👁️ Ver Vuelos
          </button>
          <button
            className={`admin-tab-button ${
              activeTab === "create" ? "active" : ""
            }`}
            onClick={() => setActiveTab("create")}
          >
            ➕ Crear Vuelo
          </button>
          <button
            className={`admin-tab-button ${
              activeTab === "stats" ? "active" : ""
            }`}
            onClick={() => setActiveTab("stats")}
          >
            📊 Estadísticas
          </button>
        </div>

        <div className="admin-tab-content">
          {activeTab === "view" && (
            <div className="flights-list-section">
              <div className="section-header">
                <h2>Lista de Vuelos</h2>
                <div className="flights-count">
                  Total: {flights.length} vuelos | Mostrando:{" "}
                  {getPaginatedFlights().length} de {flights.length} | Página{" "}
                  {currentPage} de {totalPages}
                </div>
              </div>

              <div className="flights-table-container">
                <table className="flights-table">
                  <thead>
                    <tr>
                      <th>Vuelo</th>
                      <th>Ruta</th>
                      <th>Horario</th>
                      <th>Precio</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedFlights().map((flight) => (
                      <tr
                        key={flight.id}
                        className={`${
                          flight.status === "Inactivo" ? "inactive-flight" : ""
                        } flight-row-clickable`}
                        onClick={() => handleEditClick(flight)}
                        style={{ cursor: "pointer" }}
                        title="Click para editar vuelo"
                      >
                        <td>
                          <div className="flight-info-cell">
                            <div className="flight-number">
                              {flight.flightNumber}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="route-info-cell">
                            <div className="route">{flight.route}</div>
                          </div>
                        </td>
                        <td>
                          <div className="schedule-cell">{flight.schedule}</div>
                        </td>
                        <td>
                          <div className="price-cell">
                            {formatPrice(flight.price)}
                          </div>
                        </td>
                        <td>
                          <div
                            className={`type-cell ${
                              flight.tipo_vuelo === "regreso"
                                ? "return-flight"
                                : "outbound-flight"
                            }`}
                          >
                            {flight.tipo_vuelo === "regreso" ? "Vuelta" : "Ida"}
                          </div>
                        </td>
                        <td>
                          <div
                            className={`status-cell ${
                              flight.status === "Activo" ? "active" : "inactive"
                            }`}
                          >
                            {flight.status}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {flights.length === 0 && (
                  <div className="no-flights-message">
                    <div className="no-flights-icon">✈️</div>
                    <h3>No hay vuelos registrados</h3>
                    <p>
                      Comienza creando tu primer vuelo en la pestaña "Crear
                      Vuelo"
                    </p>
                  </div>
                )}

                {flights.length > 0 && (
                  <div className="pagination-container">
                    <div className="pagination-info">
                      Mostrando {getPaginatedFlights().length} de{" "}
                      {flights.length} vuelos
                    </div>

                    <div className="pagination-controls">
                      <button
                        className={`pagination-btn ${
                          currentPage === 1 ? "disabled" : ""
                        }`}
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        ← Anterior
                      </button>

                      {getPageNumbers().map((number) => (
                        <button
                          key={number}
                          className={`pagination-btn ${
                            currentPage === number ? "active" : ""
                          }`}
                          onClick={() => paginate(number)}
                        >
                          {number}
                        </button>
                      ))}

                      <button
                        className={`pagination-btn ${
                          currentPage === totalPages ? "disabled" : ""
                        }`}
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente →
                      </button>
                    </div>

                    {totalPages > 5 && (
                      <div className="page-jump">
                        <span>Ir a página: </span>
                        <select
                          value={currentPage}
                          onChange={(e) => paginate(Number(e.target.value))}
                          className="page-select"
                        >
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          ).map((page) => (
                            <option key={page} value={page}>
                              {page}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "create" && (
            <div className="create-flight-section">
              <div className="section-header">
                <h2>Crear Nuevo Vuelo</h2>
                <p>Completa el formulario para agregar un nuevo vuelo</p>
              </div>

              <div
                className="time-restriction-info"
                style={{
                  background: "#e3f2fd",
                  border: "1px solid #2196f3",
                  borderRadius: "8px",
                  padding: "15px",
                  margin: "20px 0",
                  fontSize: "14px",
                  color: "#1976d2",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>✈️</span>
                  <strong>Información Importante:</strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  <li>
                    <strong>Vuelo de Ida:</strong> Usa fecha/hora de salida
                  </li>
                  <li>
                    <strong>Vuelo de Regreso:</strong> Se crea automáticamente
                    con fecha/hora de llegada
                  </li>
                  <li>
                    <strong>Nota:</strong> Ambos vuelos se crean como "solo_ida"
                    en el sistema
                  </li>
                </ul>
              </div>

              <form className="flight-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="origen">Origen *</label>
                    <select
                      id="origen"
                      name="origen"
                      value={flightForm.origen}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Selecciona una ciudad</option>
                      {getAvailableOrigins(flightForm.destino).map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="destino">Destino *</label>
                    <select
                      id="destino"
                      name="destino"
                      value={flightForm.destino}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Selecciona una ciudad</option>
                      {getAvailableDestinations(flightForm.origen).map(
                        (city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="fecha_salida">
                      Fecha de salida (Ida) *
                    </label>
                    <input
                      type="date"
                      id="fecha_salida"
                      name="fecha_salida"
                      value={flightForm.fecha_salida}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="hora_salida">Hora de salida (Ida) *</label>
                    <input
                      type="time"
                      id="hora_salida"
                      name="hora_salida"
                      value={flightForm.hora_salida}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fecha_llegada">Fecha de regreso *</label>
                    <input
                      type="date"
                      id="fecha_llegada"
                      name="fecha_llegada"
                      value={flightForm.fecha_llegada}
                      onChange={handleInputChange}
                      required
                      min={flightForm.fecha_salida}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="hora_llegada">Hora de regreso *</label>
                    <input
                      type="time"
                      id="hora_llegada"
                      name="hora_llegada"
                      value={flightForm.hora_llegada}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="costo_economico">
                      Costo Económico (COP) *
                    </label>
                    <input
                      type="number"
                      id="costo_economico"
                      name="costo_economico"
                      value={flightForm.costo_economico}
                      onChange={handleInputChange}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="costo_vip">Costo VIP (COP) *</label>
                    <input
                      type="number"
                      id="costo_vip"
                      name="costo_vip"
                      value={flightForm.costo_vip}
                      onChange={handleInputChange}
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn primary">
                    ✈️ Crear Vuelo Ida y Regreso
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="stats-section">
              <div className="section-header">
                <h2>Estadísticas de Vuelos</h2>
                <p>Resumen general de la operación de vuelos</p>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">✈️</div>
                  <div className="stat-content">
                    <div className="stat-number">{flights.length}</div>
                    <div className="stat-label">Total de Vuelos</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {flights.filter((f) => f.status === "Activo").length}
                    </div>
                    <div className="stat-label">Vuelos Activos</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">🔄</div>
                  <div className="stat-content">
                    <div className="stat-number">
                      {flights.filter((f) => f.tipo_vuelo === "regreso").length}
                    </div>
                    <div className="stat-label">Vuelos de Regreso</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📄</div>
                  <div className="stat-content">
                    <div className="stat-number">{totalPages}</div>
                    <div className="stat-label">Páginas de Vuelos</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL DE EDICIÓN */}
        {showEditModal && (
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              className="modal-content"
              style={{
                backgroundColor: "white",
                padding: "30px",
                borderRadius: "10px",
                width: "500px",
                maxWidth: "90%",
              }}
            >
              <h2 style={{ marginBottom: "20px" }}>
                ✏️ Editar Vuelo {editingFlight?.flightNumber}
              </h2>

              <form onSubmit={handleUpdateFlight}>
                <div className="form-group">
                  <label>Estado del Vuelo</label>
                  <select
                    name="estado"
                    value={editForm.estado}
                    onChange={handleEditChange}
                    style={{ width: "100%", padding: "8px" }}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Retrasado">Retrasado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Costo Económico</label>
                  <input
                    type="number"
                    name="costo_economico"
                    value={editForm.costo_economico}
                    onChange={handleEditChange}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>

                <div className="form-group">
                  <label>Costo VIP</label>
                  <input
                    type="number"
                    name="costo_vip"
                    value={editForm.costo_vip}
                    onChange={handleEditChange}
                    style={{ width: "100%", padding: "8px" }}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Fecha Salida{" "}
                    {!canEditDates && (
                      <span style={{ color: "red" }}>
                        (Bloqueado: Hay pasajeros)
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    name="fecha_salida"
                    value={editForm.fecha_salida}
                    onChange={handleEditChange}
                    disabled={!canEditDates}
                    style={{
                      width: "100%",
                      padding: "8px",
                      backgroundColor: !canEditDates ? "#eee" : "white",
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Hora Salida{" "}
                    {!canEditDates && (
                      <span style={{ color: "red" }}>(Bloqueado)</span>
                    )}
                  </label>
                  <input
                    type="time"
                    name="hora_salida"
                    value={editForm.hora_salida}
                    onChange={handleEditChange}
                    disabled={!canEditDates}
                    style={{
                      width: "100%",
                      padding: "8px",
                      backgroundColor: !canEditDates ? "#eee" : "white",
                    }}
                  />
                </div>

                <div
                  style={{ display: "flex", gap: "10px", marginTop: "20px" }}
                >
                  <button type="submit" className="submit-btn primary">
                    Guardar Cambios
                  </button>
                  <button
                    type="button"
                    className="submit-btn"
                    style={{ backgroundColor: "#ccc" }}
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageFlights;
