import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "./apiService";
import "./App.css";
import "./MyPurchases.css";

const MyPurchases = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const initData = async () => {
      console.log("🔄 INIT: Starting MyPurchases initialization");

      // Verificar autenticación
      const authToken =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      const userData =
        localStorage.getItem("userData") || sessionStorage.getItem("userData");

      if (!authToken || !userData) {
        console.log("❌ No auth token or user data, redirecting to login");
        navigate("/login");
        return;
      }

      try {
        const user = JSON.parse(userData);
        setUserInfo(user);
        console.log("✅ User info set:", user);

        // Cargar compras del usuario
        await loadUserPurchases(user);
      } catch (err) {
        console.error("❌ Error initializing MyPurchases:", err);
        setLoading(false);
      }
    };

    initData();
  }, [navigate]);

  // Función para obtener ID del cliente
  const obtenerIdCliente = (userInfo) => {
    if (!userInfo) return null;

    const posiblesIds = [
      userInfo.id,
      userInfo.idcliente,
      userInfo.id_usuario,
      userInfo.documento,
      userInfo.cedula,
      userInfo.numero_documento,
    ];

    const idEncontrado = posiblesIds.find(
      (id) => id && id !== "No especificado" && id !== "undefined"
    );

    return idEncontrado || null;
  };

  // Función para cargar compras del usuario
  const loadUserPurchases = async (user) => {
    try {
      setLoading(true);

      // Obtener ID del cliente
      const userId = obtenerIdCliente(user);
      if (!userId) {
        throw new Error("No se pudo identificar al usuario");
      }

      console.log("🔄 Loading purchases for user ID:", userId);

      // Llamar al endpoint del backend
      const response = await apiService.get(`/compra/historial/${userId}`);

      if (response && Array.isArray(response)) {
        console.log("✅ Purchases loaded:", response.length);
        setPurchases(response);
      } else {
        console.log("ℹ️ No purchases found or empty response");
        setPurchases([]);
      }
    } catch (err) {
      console.error("❌ Error loading purchases:", err);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear precio
  const formatPrice = (price) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price || 0);

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return "No especificada";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Función para recargar compras
  const handleRefresh = () => {
    if (userInfo) {
      loadUserPurchases(userInfo);
    }
  };

  // Renderizar componente
  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <div className="logo-container" onClick={() => navigate("/")}>
            <img
              src="https://i.pinimg.com/736x/60/48/b4/6048b4ae7f74724389d345767e8061a0.jpg"
              alt="VivaSky Logo"
              className="logo-image"
            />
            <span className="logo-text">VivaSky</span>
          </div>
        </header>
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Cargando tus compras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo-container" onClick={() => navigate("/")}>
          <img
            src="https://i.pinimg.com/736x/60/48/b4/6048b4ae7f74724389d345767e8061a0.jpg"
            alt="VivaSky Logo"
            className="logo-image"
          />
          <span className="logo-text">VivaSky</span>
        </div>
        <div className="header-actions">
          <button className="back-btn" onClick={() => navigate(-1)}>
            Volver
          </button>
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            title="Actualizar compras"
          >
            🔄
          </button>
        </div>
      </header>

      <div className="purchases-container">
        <div className="purchases-header">
          <h1>🛍️ Mis Compras</h1>
          <p>Historial de todos los vuelos que has comprado</p>
        </div>

        {purchases.length === 0 ? (
          <div className="empty-purchases">
            <div className="empty-icon">✈️</div>
            <h4>Aún no has realizado compras</h4>
            <p>Cuando compres un vuelo, aparecerá aquí en tu historial.</p>
            <button
              className="search-flights-btn"
              onClick={() => navigate("/search")}
            >
              Buscar Vuelos
            </button>
          </div>
        ) : (
          <div className="purchases-list">
            {purchases.map((purchase) => (
              <div key={purchase.id_compra} className="purchase-card">
                <div className="purchase-card-header">
                  <div className="purchase-id">
                    <strong>Compra #{purchase.id_compra}</strong>
                    <span className="purchase-date">
                      {formatDate(purchase.fecha_compra)}
                    </span>
                  </div>
                  <div className="purchase-status">
                    <span className="status-badge paid">✅ Pagado</span>
                  </div>
                </div>

                <div className="purchase-card-body">
                  <div className="purchase-route">
                    <div className="route-origin">
                      <span className="city">
                        {purchase.origen || "Origen"}
                      </span>
                    </div>
                    <div className="route-arrow">→</div>
                    <div className="route-destination">
                      <span className="city">
                        {purchase.destino || "Destino"}
                      </span>
                    </div>
                  </div>

                  <div className="purchase-details">
                    <div className="detail-row">
                      <span className="detail-label">Fecha del vuelo:</span>
                      <span className="detail-value">
                        {formatDate(purchase.fecha_vuelo)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Clase:</span>
                      <span className="detail-value">
                        {purchase.clase === "vip" ? "⭐ VIP" : "💺 Económica"}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Método de pago:</span>
                      <span className="detail-value">
                        {purchase.metodo_pago === "credito"
                          ? "💳 Crédito"
                          : purchase.metodo_pago === "debito"
                          ? "💳 Débito"
                          : "💳 Tarjeta"}
                      </span>
                    </div>
                  </div>

                  <div className="purchase-total">
                    <span>Total pagado:</span>
                    <span className="total-amount">
                      {formatPrice(purchase.monto)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="purchases-info">
          <p className="info-note">
            💡 <strong>Nota:</strong> Este es tu historial de compras. Cada
            compra incluye todos los detalles del vuelo adquirido.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyPurchases;
