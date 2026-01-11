import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./App.css";

// Importamos los componentes
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import ChangePassword from "./ChangePassword";
import UserMenu from "./UserMenu";
import EditProfile from "./EditProfile";
import CreateAdmin from "./CreateAdmin";
import CompleteAdminInfo from "./CompleteAdminInfo";
import SearchFlights from "./SearchFlights";
import ReserveFlight from "./ReserveFlight";
import ManageFlights from "./ManageFlights";
import Cart from "./Cart";
import PurchaseFlight from "./PurchaseFlight";
import News from "./News";
import CancelFlights from "./CancelFlights";
import Payments from "./Payments";
import MyPurchases from "./MyPurchases";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/create-admin" element={<CreateAdmin />} />
        <Route path="/complete-admin-info" element={<CompleteAdminInfo />} />
        <Route path="/search-flights" element={<SearchFlights />} />
        <Route path="/reserve-flight" element={<ReserveFlight />} />
        <Route path="/manage-flights" element={<ManageFlights />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/purchase-flight" element={<PurchaseFlight />} />
        <Route path="/news" element={<News />} />
        <Route path="/cancel-flights" element={<CancelFlights />} />
        <Route path="/balance-payments" element={<Payments />} />
        <Route path="/my-purchases" element={<MyPurchases />} />
      </Routes>
    </Router>
  );
};

// Componente de la página de inicio
const HomePage = () => {
  const [tripType, setTripType] = useState("roundtrip");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [availableOrigins, setAvailableOrigins] = useState([]);
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // URL de ejemplo para el logo
  const logoUrl =
    "https://i.pinimg.com/736x/60/48/b4/6048b4ae7f74724389d345767e8061a0.jpg";

  // Lista de ciudades colombianas (capitales departamentales) - ORDENADA ALFABÉTICAMENTE
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
  ].sort(); // Orden alfabético

  // Ciudades internacionales - ORDENADAS ALFABÉTICAMENTE
  const internationalCities = [
    "Buenos Aires",
    "Londres",
    "Madrid",
    "Miami",
    "New York",
  ].sort(); // Orden alfabético

  // Ciudades colombianas que pueden acceder a destinos internacionales - ORDENADAS ALFABÉTICAMENTE
  const internationalGateways = [
    "Bogotá",
    "Cali",
    "Cartagena",
    "Medellín",
    "Pereira",
  ].sort(); // Orden alfabético

  // Función para ordenar arrays alfabéticamente
  const sortAlphabetically = (array) => {
    return array.sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  };

  // 🔥 CORREGIDO: Función para obtener ciudades únicas - SIN LLAMADAS AL BACKEND
  const fetchAvailableCities = async () => {
    setLoadingCities(true);
    try {
      // 🔥 USAR SIEMPRE LAS CIUDADES POR DEFECTO - SIN LLAMAR AL BACKEND
      const allCities = sortAlphabetically([
        ...colombianCities,
        ...internationalCities,
      ]);
      setAvailableOrigins(allCities);
      setAvailableDestinations(allCities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      // Si hay error, usar las ciudades por defecto ya ordenadas
      setAvailableOrigins(
        sortAlphabetically([...colombianCities, ...internationalCities])
      );
      setAvailableDestinations(
        sortAlphabetically([...colombianCities, ...internationalCities])
      );
    } finally {
      setLoadingCities(false);
    }
  };

  // 🔥 CORREGIDO: Función para obtener destinos disponibles según el origen seleccionado - SIN BACKEND
  const fetchDestinationsByOrigin = async (selectedOrigin) => {
    if (!selectedOrigin) {
      setAvailableDestinations(
        sortAlphabetically([...colombianCities, ...internationalCities])
      );
      return;
    }

    setLoadingCities(true);
    try {
      // 🔥 USAR DIRECTAMENTE LA LÓGICA LOCAL - SIN LLAMAR AL BACKEND
      getAvailableDestinationsLocal(selectedOrigin);
    } catch (error) {
      console.error("Error fetching destinations:", error);
      // Fallback a lógica local
      getAvailableDestinationsLocal(selectedOrigin);
    } finally {
      setLoadingCities(false);
    }
  };

  // 🔥 CORREGIDO: Función para obtener orígenes disponibles según el destino seleccionado - SIN BACKEND
  const fetchOriginsByDestination = async (selectedDestination) => {
    if (!selectedDestination) {
      setAvailableOrigins(
        sortAlphabetically([...colombianCities, ...internationalCities])
      );
      return;
    }

    setLoadingCities(true);
    try {
      // 🔥 USAR DIRECTAMENTE LA LÓGICA LOCAL - SIN LLAMAR AL BACKEND
      getAvailableOriginsLocal(selectedDestination);
    } catch (error) {
      console.error("Error fetching origins:", error);
      // Fallback a lógica local
      getAvailableOriginsLocal(selectedDestination);
    } finally {
      setLoadingCities(false);
    }
  };

  // Lógica local de respaldo para destinos
  const getAvailableDestinationsLocal = (selectedOrigin) => {
    if (!selectedOrigin) return;

    let destinations = [];

    // Si el origen es una ciudad internacional, solo puede volar a ciudades gateway colombianas
    if (internationalCities.includes(selectedOrigin)) {
      destinations = internationalGateways;
    }
    // Si el origen es una ciudad gateway colombiana, puede volar a todas las ciudades (excepto sí misma)
    else if (internationalGateways.includes(selectedOrigin)) {
      destinations = [
        ...colombianCities.filter((city) => city !== selectedOrigin),
        ...internationalCities,
      ];
    }
    // Si el origen es una ciudad colombiana NO gateway, solo puede volar a ciudades colombianas (excepto sí misma)
    else {
      destinations = colombianCities.filter((city) => city !== selectedOrigin);
    }

    // Ordenar alfabéticamente antes de establecer el estado
    setAvailableDestinations(sortAlphabetically(destinations));
  };

  // Lógica local de respaldo para orígenes
  const getAvailableOriginsLocal = (selectedDestination) => {
    if (!selectedDestination) return;

    let origins = [];

    // Si el destino es una ciudad internacional, solo las ciudades gateway colombianas pueden volar allí
    if (internationalCities.includes(selectedDestination)) {
      origins = internationalGateways;
    }
    // Si el destino es una ciudad gateway colombiana, puede recibir vuelos de todas las ciudades (excepto sí misma)
    else if (internationalGateways.includes(selectedDestination)) {
      origins = [
        ...colombianCities.filter((city) => city !== selectedDestination),
        ...internationalCities,
      ];
    }
    // Si el destino es una ciudad colombiana NO gateway, solo puede recibir vuelos de ciudades colombianas (excepto sí misma)
    else {
      origins = colombianCities.filter((city) => city !== selectedDestination);
    }

    // Ordenar alfabéticamente antes de establecer el estado
    setAvailableOrigins(sortAlphabetically(origins));
  };

  // Función para validar si una ruta es permitida
  const isValidRoute = (originCity, destinationCity) => {
    // Si no hay origen o destino seleccionado, la ruta es válida (búsqueda individual)
    if (!originCity || !destinationCity) return true;

    // Verificar si la ruta existe en las opciones disponibles
    const isOriginAvailable = availableOrigins.includes(originCity);
    const isDestinationAvailable =
      availableDestinations.includes(destinationCity);

    return isOriginAvailable && isDestinationAvailable;
  };

  // Función para mostrar el mensaje de "próximamente"
  const handleComingSoon = () => {
    alert("Esta funcionalidad estará activa próximamente");
  };

  // NUEVA FUNCIÓN: Manejar click en Reservar
  const handleReservarClick = () => {
    setShowReservationModal(true);
  };

  // NUEVA FUNCIÓN: Cerrar modal de reserva
  const closeReservationModal = () => {
    setShowReservationModal(false);
  };

  // NUEVA FUNCIÓN: Ir a login desde modal de reserva
  const handleGoToLogin = () => {
    setShowReservationModal(false);
    navigate("/login");
  };

  // NUEVA FUNCIÓN: Ir a registro desde modal de reserva
  const handleGoToRegister = () => {
    setShowReservationModal(false);
    navigate("/register");
  };

  // Función para redirigir al inicio al hacer clic en el logo
  const handleLogoClick = () => {
    navigate("/");
  };

  // Función para formatear fecha en formato YYYY-MM-DD (para inputs type="date")
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Función para formatear fecha en formato legible (vie, 19 sept)
  const formatDisplayDate = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const options = { weekday: "short", day: "numeric", month: "short" };
    return date.toLocaleDateString("es-ES", options);
  };

  // Función para obtener la fecha local
  const getLocalDate = (date) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  };

  // Verificar autenticación
  const checkAuth = () => {
    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const userData =
      localStorage.getItem("userData") || sessionStorage.getItem("userData");

    if (authToken && userData) {
      try {
        const user = JSON.parse(userData);
        setUserInfo({
          nombre: user.nombre,
          correo: user.correo,
          role: user.tipo_usuario || user.role || "Usuario",
        });
        setIsAuthenticated(true);
        return true;
      } catch (error) {
        console.error("Error parsing user data:", error);
        handleLogout();
      }
    }
    return false;
  };

  // Efecto para manejar la información del usuario al cargar
  useEffect(() => {
    checkAuth();
    fetchAvailableCities();

    // Verificar si hay mensaje de bienvenida después del login
    if (location.state?.message) {
      setWelcomeMessage(location.state.message);
      const timer = setTimeout(() => {
        setWelcomeMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Obtener la fecha mínima para los inputs (hoy)
  const today = formatDateForInput(getLocalDate(new Date()));

  // Efecto para actualizar destinos cuando cambia el origen
  useEffect(() => {
    if (origin) {
      fetchDestinationsByOrigin(origin);
    } else {
      setAvailableDestinations(
        sortAlphabetically([...colombianCities, ...internationalCities])
      );
    }
  }, [origin]);

  // Efecto para actualizar orígenes cuando cambia el destino
  useEffect(() => {
    if (destination) {
      fetchOriginsByDestination(destination);
    } else {
      setAvailableOrigins(
        sortAlphabetically([...colombianCities, ...internationalCities])
      );
    }
  }, [destination]);

  // NUEVA FUNCIÓN: Verificar si hay ciudades internacionales en una lista
  const hasInternationalCities = (citiesList) => {
    return citiesList.some((city) => internationalCities.includes(city));
  };

  // NUEVA FUNCIÓN: Filtrar ciudades colombianas de una lista
  const getColombianCities = (citiesList) => {
    return citiesList.filter((city) => colombianCities.includes(city));
  };

  // NUEVA FUNCIÓN: Filtrar ciudades internacionales de una lista
  const getInternationalCities = (citiesList) => {
    return citiesList.filter((city) => internationalCities.includes(city));
  };

  // NUEVA FUNCIÓN: Validar que al menos un campo esté lleno
  const hasAtLeastOneField = () => {
    return origin || destination || departureDate || returnDate;
  };

  // NUEVA FUNCIÓN: Obtener el tipo de búsqueda basado en los campos llenos
  const getSearchType = () => {
    if (origin && destination && departureDate) {
      return "completa";
    } else if (origin && !destination && !departureDate && !returnDate) {
      return "por-origen";
    } else if (!origin && destination && !departureDate && !returnDate) {
      return "por-destino";
    } else if (!origin && !destination && departureDate && !returnDate) {
      return "por-fecha-salida";
    } else if (!origin && !destination && !departureDate && returnDate) {
      return "por-fecha-retorno";
    } else {
      return "combinada";
    }
  };

  const popularDestinations = [
    {
      name: "Madrid",
      image:
        "https://i.pinimg.com/1200x/2c/b8/a9/2cb8a9190321ee91cdf63cca2d45668f.jpg",
      description:
        "Madrid, la capital de España, es conocida por su rica herencia cultural, edificios históricos y vida nocturna vibrante.",
      price: "****",
      duration: "* horas",
      bestTime: "**/**",
    },
    {
      name: "Nueva York",
      image:
        "https://i.pinimg.com/1200x/ec/d1/c5/ecd1c529ffa462f1ae3df97fbfbb1ab4.jpg",
      description:
        "Nueva York, la ciudad que nunca duerme, ofrece experiencias únicas con sus rascacielos, Broadway y diversidad cultural.",
      price: "**",
      duration: "* horas",
      bestTime: "**/**",
    },
    {
      name: "Miami",
      image:
        "https://i.pinimg.com/736x/59/36/24/59362492e00b42138c6af00da2ac4b5a.jpg",
      description:
        "Miami es famosa por sus playas soleadas, vida nocturna emocionante y influencia latinoamericana.",
      price: "****",
      duration: "* horas",
      bestTime: "**/**",
    },
  ];

  // 🔥 FUNCIÓN MODIFICADA: Manejar búsqueda con parámetros mejorados
  const handleSearch = async (e) => {
    e.preventDefault();

    // Validar que al menos un campo esté lleno
    if (!hasAtLeastOneField()) {
      alert("Por favor completa al menos un campo para buscar vuelos");
      return;
    }

    // Validar si hay origen y destino seleccionados, que la ruta sea permitida
    if (origin && destination && !isValidRoute(origin, destination)) {
      alert(
        `Lo sentimos. No hay vuelos disponibles desde ${origin} hacia ${destination}.`
      );
      return;
    }

    // Validación de fechas solo para viajes redondos cuando ambas fechas están presentes
    if (
      tripType === "roundtrip" &&
      departureDate &&
      returnDate &&
      new Date(returnDate) < new Date(departureDate)
    ) {
      alert("La fecha de retorno no puede ser anterior a la fecha de salida");
      return;
    }

    const departureDateSQL = departureDate
      ? new Date(departureDate).toISOString().split("T")[0]
      : null;

    const returnDateSQL =
      returnDate && tripType === "roundtrip"
        ? new Date(returnDate).toISOString().split("T")[0]
        : null;

    const searchType = getSearchType();

    // 🔥 MODIFICADO: Enviar parámetros mejorados para búsqueda flexible
    navigate("/search-flights", {
      state: {
        // Parámetros originales (compatibilidad)
        origin,
        destination,
        departureDate,
        departureDateSQL,
        returnDate: tripType === "roundtrip" ? returnDate : null,
        tripType,
        searchType,

        // 🔥 NUEVOS PARÁMETROS PARA BÚSQUEDA FLEXIBLE
        searchParams: {
          origen: origin,
          destino: destination,
          fecha_salida: departureDateSQL,
          fecha_regreso: returnDateSQL,
          tipo_viaje: tripType === "roundtrip" ? "idayvuelta" : "soloida",
        },

        // 🔥 INFORMACIÓN ADICIONAL PARA MEJORAR LA BÚSQUEDA
        searchContext: {
          hasOrigin: !!origin,
          hasDestination: !!destination,
          hasDepartureDate: !!departureDate,
          hasReturnDate: !!returnDate,
          isFlexibleSearch: !origin || !destination || !departureDate,
          searchMode: tripType === "roundtrip" ? "roundtrip" : "oneway",
        },
      },
    });
  };

  const handleDepartureDateChange = (e) => {
    const newDepartureDate = e.target.value;
    setDepartureDate(newDepartureDate);

    if (
      tripType === "roundtrip" &&
      returnDate &&
      new Date(returnDate) < new Date(newDepartureDate)
    ) {
      setReturnDate(newDepartureDate);
    }
  };

  const handleReturnDateChange = (e) => {
    setReturnDate(e.target.value);
  };

  // NUEVAS FUNCIONES: Manejar cambios en origen y destino
  const handleOriginChange = (e) => {
    const newOrigin = e.target.value;
    setOrigin(newOrigin);
  };

  const handleDestinationChange = (e) => {
    const newDestination = e.target.value;
    setDestination(newDestination);
  };

  const handleDestinationClick = (dest) => {
    setSelectedDestination(dest);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDestination(null);
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("userEmail");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");

    setUserInfo(null);
    setIsAuthenticated(false);
    setWelcomeMessage("");
    alert("Has cerrado sesión exitosamente");
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div
          className="logo-container"
          onClick={handleLogoClick}
          style={{ cursor: "pointer" }}
        >
          <img src={logoUrl} alt="VivaSky Logo" className="logo-image" />
          <span className="logo-text">VivaSky</span>
        </div>

        {/* Mostrar información del usuario si está logeado */}
        {isAuthenticated && userInfo ? (
          <UserMenu userInfo={userInfo} onLogout={handleLogout} />
        ) : (
          <nav className="navigation">
            <a href="#" onClick={handleReservarClick}>
              Reservas
            </a>
            <a href="#" onClick={() => navigate("/news")}>
              Noticias
            </a>
          </nav>
        )}

        {!isAuthenticated && (
          <button className="sign-up-btn" onClick={handleLoginClick}>
            Iniciar sesión
          </button>
        )}
      </header>

      {/* Mostrar mensaje de bienvenida temporal */}
      {welcomeMessage && (
        <div className="welcome-banner">
          <div className="success-message">✅ {welcomeMessage}</div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Descubre el mundo mientras viajas con nosotros</h1>

          <form className="flight-form" onSubmit={handleSearch}>
            <div className="trip-type">
              <label className={tripType === "roundtrip" ? "active" : ""}>
                <input
                  type="radio"
                  name="tripType"
                  value="roundtrip"
                  checked={tripType === "roundtrip"}
                  onChange={() => setTripType("roundtrip")}
                />
                Ida y vuelta
              </label>
              <label className={tripType === "oneway" ? "active" : ""}>
                <input
                  type="radio"
                  name="tripType"
                  value="oneway"
                  checked={tripType === "oneway"}
                  onChange={() => setTripType("oneway")}
                />
                Solo ida
              </label>
            </div>

            <div className="form-fields">
              {/* ORIGEN */}
              <div className="input-group">
                <label>Salida</label>
                <select
                  value={origin}
                  onChange={handleOriginChange}
                  className={!origin ? "optional-field" : ""}
                  disabled={loadingCities}
                >
                  <option value="">Cualquier ciudad de origen</option>

                  {/* MOSTRAR CIUDADES INTERNACIONALES SOLO SI HAY */}
                  {hasInternationalCities(availableOrigins) && (
                    <optgroup label="🌍 Ciudades Internacionales">
                      {getInternationalCities(availableOrigins).map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* MOSTRAR SIEMPRE CIUDADES COLOMBIANAS */}
                  <optgroup label="🇨🇴 Ciudades Colombianas">
                    {getColombianCities(availableOrigins).map((city) => (
                      <option key={city} value={city}>
                        {city}
                        {internationalGateways.includes(city) && ""}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {loadingCities && (
                  <small
                    style={{
                      color: "#0077b6",
                      fontSize: "12px",
                      marginTop: "5px",
                    }}
                  >
                    🔄 Cargando opciones...
                  </small>
                )}
                {origin && (
                  <small
                    style={{
                      color: "#28a745",
                      fontSize: "12px",
                      marginTop: "5px",
                    }}
                  >
                    ✅ {availableDestinations.length} destinos disponibles
                  </small>
                )}
              </div>

              {/* DESTINO */}
              <div className="input-group">
                <label>Destino</label>
                <select
                  value={destination}
                  onChange={handleDestinationChange}
                  className={!destination ? "optional-field" : ""}
                  disabled={loadingCities}
                >
                  <option value="">Cualquier ciudad de destino</option>

                  {/* MOSTRAR DESTINOS INTERNACIONALES SOLO SI HAY */}
                  {hasInternationalCities(availableDestinations) && (
                    <optgroup label="🌍 Destinos Internacionales">
                      {getInternationalCities(availableDestinations).map(
                        (city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        )
                      )}
                    </optgroup>
                  )}

                  {/* MOSTRAR SIEMPRE DESTINOS COLOMBIANOS */}
                  <optgroup label="🇨🇴 Destinos Colombianos">
                    {getColombianCities(availableDestinations).map((city) => (
                      <option key={city} value={city}>
                        {city}
                        {internationalGateways.includes(city) && ""}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {loadingCities && (
                  <small
                    style={{
                      color: "#0077b6",
                      fontSize: "12px",
                      marginTop: "5px",
                    }}
                  >
                    🔄 Cargando opciones...
                  </small>
                )}
                {destination && (
                  <small
                    style={{
                      color: "#28a745",
                      fontSize: "12px",
                      marginTop: "5px",
                    }}
                  >
                    ✅ {availableOrigins.length} orígenes disponibles
                  </small>
                )}
              </div>

              <div className="input-group">
                <label>Fecha de salida</label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={handleDepartureDateChange}
                  min={today}
                  placeholder="Cualquier fecha"
                />
              </div>

              {tripType === "roundtrip" && (
                <div className="input-group">
                  <label>Fecha de retorno</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={handleReturnDateChange}
                    min={departureDate || today}
                    placeholder="Cualquier fecha"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="search-btn"
              disabled={!hasAtLeastOneField()}
            >
              {!hasAtLeastOneField()
                ? "Completa al menos un campo"
                : "Buscar vuelos"}
            </button>
          </form>
        </div>
      </section>

      {/* Popular Destinations Section */}
      <section className="popular-destinations">
        <h2>Promociones</h2>
        <div className="destinations-grid">
          {popularDestinations.map((dest, index) => (
            <div
              key={index}
              className="destination-card"
              onClick={() => handleDestinationClick(dest)}
            >
              <div
                className="destination-image"
                style={{ backgroundImage: `url(${dest.image})` }}
              ></div>
              <h3>{dest.name}</h3>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <p>© 2025 VivaSky. Todos los derechos reservados.</p>
      </footer>

      {/* Modal para información del destino */}
      {showModal && selectedDestination && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="destination-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeModal}>
              ×
            </button>
            <div className="modal-header">
              <h2>{selectedDestination.name}</h2>
              <div
                className="destination-image-modal"
                style={{ backgroundImage: `url(${selectedDestination.image})` }}
              ></div>
            </div>
            <div className="modal-content">
              <p className="destination-description">
                {selectedDestination.description}
              </p>
              <div className="destination-details">
                <div className="detail-item">
                  <span className="detail-label">Precio:</span>
                  <span className="detail-value">
                    {selectedDestination.price}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Duración del vuelo:</span>
                  <span className="detail-value">
                    {selectedDestination.duration}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Fecha de promocion:</span>
                  <span className="detail-value">
                    {selectedDestination.bestTime}
                  </span>
                </div>
              </div>
              <button
                className="choose-destination-btn"
                onClick={handleComingSoon}
              >
                Elegir promoción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de reserva */}
      {showReservationModal && (
        <div className="modal-overlay" onClick={closeReservationModal}>
          <div
            className="reservation-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeReservationModal}>
              ×
            </button>
            <div className="modal-content">
              <h2>¿Ya tienes una cuenta?</h2>
              <p className="modal-subtitle">
                Para realizar reservas necesitas tener una cuenta en VivaSky
              </p>

              <div className="reservation-options">
                <button
                  className="reservation-option-btn primary"
                  onClick={handleGoToLogin}
                >
                  Iniciar Sesión
                </button>

                <div className="reservation-divider">
                  <span>o</span>
                </div>

                <button
                  className="reservation-option-btn secondary"
                  onClick={handleGoToRegister}
                >
                  Registrar Usuario
                </button>
              </div>

              <button
                className="reservation-cancel-btn"
                onClick={closeReservationModal}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
