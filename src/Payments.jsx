import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "./apiService";
import UserMenu from "./UserMenu";
import "./Payments.css";

const Payments = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  // --- ESTADOS DEL FORMULARIO ---
  const [newCardNum, setNewCardNum] = useState("");
  const [newCardType, setNewCardType] = useState("credito"); // CORRECTO: "credito" en minúscula
  // const [newCardBank, setNewCardBank] = useState(""); // ELIMINADO
  const [newCardExpDate, setNewCardExpDate] = useState("");
  const [newCardCVV, setNewCardCVV] = useState("");
  const [newCardName, setNewCardName] = useState("");

  const [rechargeAmount, setRechargeAmount] = useState("");
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [userInfo, setUserInfo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const logoUrl =
    "https://i.pinimg.com/736x/60/48/b4/6048b4ae7f74724389d345767e8061a0.jpg";

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const maskCardNumber = (num) => {
    if (!num || num.length <= 4) return num;
    return `**** **** **** ${num.slice(-4)}`;
  };

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const authToken =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      const userData =
        localStorage.getItem("userData") || sessionStorage.getItem("userData");

      if (authToken && userData) {
        try {
          const user = JSON.parse(userData);
          setUserInfo({
            nombre: user.nombre,
            correo: user.correo,
            role: user.tipo_usuario || user.role || "cliente",
          });
          setIsAuthenticated(true);
          await fetchCards();
        } catch (error) {
          console.error("Error parsing user data:", error);
          handleLogout();
        }
      } else {
        navigate("/login", { state: { from: "/balance-payments" } });
      }
    };
    checkAuthAndFetchData();
  }, [navigate]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.get("/cards");
      setCards(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");
    setUserInfo(null);
    setIsAuthenticated(false);
    navigate("/login");
  };

  const openAddModal = () => {
    setFormError(null);
    setNewCardNum("");
    setNewCardType("credito"); // CORRECTO: minúscula por defecto
    // setNewCardBank(""); // ELIMINADO
    setNewCardExpDate("");
    setNewCardCVV("");
    setNewCardName("");
    setShowAddModal(true);
  };

  const openRechargeModal = (card) => {
    setFormError(null);
    setRechargeAmount("");
    setSelectedCard(card);
    setShowRechargeModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowRechargeModal(false);
    setSelectedCard(null);
  };

  // 1. Formato Tarjeta: Agrega espacio cada 4 números
  const handleCardNumChange = (e) => {
    // Eliminamos todo lo que no sea número
    const rawValue = e.target.value.replace(/\D/g, "");

    // Limitamos a 16 dígitos reales
    if (rawValue.length > 16) return;

    // Expresión regular: agrega espacio cada 4 dígitos (si hay más números después)
    const formattedValue = rawValue.replace(/(\d{4})(?=\d)/g, "$1 ");

    setNewCardNum(formattedValue);
  };

  // 2. Formato Fecha: Agrega "/" automáticamente después de 2 números
  const handleDateChange = (e) => {
    // Eliminamos todo lo que no sea número
    const rawValue = e.target.value.replace(/\D/g, "");

    // Limitamos a 4 dígitos (MMYY)
    if (rawValue.length > 4) return;

    let formattedValue = rawValue;

    // Si escribió más de 2 números, ponemos el slash
    if (rawValue.length >= 3) {
      formattedValue = `${rawValue.slice(0, 2)}/${rawValue.slice(2)}`;
    }

    setNewCardExpDate(formattedValue);
  };

  const handleAddCardSubmit = async (e) => {
    e.preventDefault();

    // Validación: Quitamos banco
    if (
      !newCardNum ||
      !newCardType ||
      !newCardExpDate ||
      !newCardCVV ||
      !newCardName
    ) {
      setFormError("Todos los campos son obligatorios.");
      return;
    }
    // Validación: CVV solo 3 dígitos
    if (!/^\d{3}$/.test(newCardCVV)) {
      setFormError("El CVV debe tener exactamente 3 dígitos.");
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(newCardExpDate)) {
      setFormError("La fecha debe tener el formato MM/AA (ej: 12/28).");
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const newCard = await apiService.post("/cards", {
        numtarjeta: newCardNum.replace(/\s/g, ""),
        tipo: newCardType,
        fecha_expiracion: newCardExpDate,
        cvv: newCardCVV,
        nombrepersona: newCardName,
      });

      setCards([...cards, newCard]);
      setFormLoading(false);
      closeModal();
    } catch (err) {
      setFormError(err.message);
      setFormLoading(false);
    }
  };

  const handleRechargeSubmit = async (e) => {
    e.preventDefault();
    const monto = parseFloat(rechargeAmount);

    if (!monto || monto <= 0) {
      setFormError("Debe ingresar un monto positivo válido.");
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      const { tarjeta: updatedCard } = await apiService.put(
        `/cards/${selectedCard.idtarjeta}/recharge`,
        { monto }
      );

      setCards(
        cards.map((card) =>
          card.idtarjeta === updatedCard.idtarjeta
            ? { ...card, ...updatedCard }
            : card
        )
      );
      setFormLoading(false);
      closeModal();
    } catch (err) {
      setFormError(err.message);
      setFormLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Cargando tus tarjetas...</p>
        </div>
      );
    }
    if (error) {
      return <div className="error-message">Error: {error}</div>;
    }
    if (cards.length === 0) {
      return (
        <div className="no-cards-message">
          <span className="no-cards-icon">💳</span>
          <h3>No tienes tarjetas registradas</h3>
          <p>Agrega una nueva tarjeta para empezar a gestionar tu saldo.</p>
        </div>
      );
    }
    return (
      <div className="cards-grid">
        {cards.map((card) => (
          <div key={card.idtarjeta} className="payment-card">
            <div className="card-header">
              <span className="card-name">{card.nombrepersona}</span>
              <span
                className={`card-type-badge ${
                  card.tipo === "credito" ? "type-credit" : "type-debit"
                }`}
              >
                {card.tipo === "credito" ? "Crédito" : "Débito"}
              </span>
            </div>
            <div className="card-body">
              <div className="card-number">
                {maskCardNumber(card.numtarjeta)}
              </div>

              {/* Podemos mostrar la fecha de expiración pequeña */}
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#777",
                  marginBottom: "10px",
                }}
              >
                Expira: {card.fecha_expiracion}
              </div>

              <div className="card-balance-label">Saldo Disponible</div>
              <div className="card-balance">{formatCurrency(card.saldo)}</div>
            </div>
            <div className="card-footer">
              <button
                className="recharge-btn"
                onClick={() => openRechargeModal(card)}
                disabled={formLoading}
              >
                Recargar Saldo
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div
          className="logo-container"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <img src={logoUrl} alt="VivaSky Logo" className="logo-image" />
          <span className="logo-text">VivaSky</span>
        </div>
        {isAuthenticated && userInfo ? (
          <UserMenu userInfo={userInfo} onLogout={handleLogout} />
        ) : (
          <nav className="navigation">
            <a href="/login">Iniciar sesión</a>
          </nav>
        )}
      </header>

      {/* Contenido Principal */}
      <div className="payments-page-container">
        <div className="payments-header">
          <h1>Saldo y Pagos</h1>
          <p>Gestiona tus tarjetas y recarga tu saldo para compras futuras.</p>
          <button
            className="add-card-btn"
            onClick={openAddModal}
            disabled={formLoading}
          >
            <span className="icon-add">+</span> Agregar Nueva Tarjeta
          </button>
        </div>
        {renderContent()}
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 VivaSky. Todos los derechos reservados.</p>
      </footer>

      {/* --- MODAL AGREGAR TARJETA --- */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="login-container modal-form"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeModal}>
              ×
            </button>
            <h2>Agregar Nueva Tarjeta</h2>
            <p className="modal-subtitle">
              Ingresa los datos de tu tarjeta de crédito o débito.
            </p>

            <form className="login-form" onSubmit={handleAddCardSubmit}>
              {formError && <div className="error-message">{formError}</div>}

              <div className="input-group">
                <label>Número de Tarjeta</label>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={newCardNum}
                  onChange={handleCardNumChange}
                  required
                />
              </div>

              <div className="input-group">
                <label>Nombre en la Tarjeta</label>
                <input
                  type="text"
                  placeholder="Ej: JUAN PEREZ"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value.toUpperCase())}
                  required
                />
              </div>

              {/* Fila para Tipo y Fecha (Ya no está el Banco) */}
              <div className="form-row">
                <div className="input-group">
                  <label>Tipo</label>
                  <select
                    value={newCardType}
                    onChange={(e) => setNewCardType(e.target.value)}
                    required
                  >
                    <option value="credito">Crédito</option>
                    <option value="debito">Débito</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Fecha Exp. (MM/AA)</label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    value={newCardExpDate}
                    onChange={handleDateChange}
                    required
                  />
                </div>
              </div>

              {/* CVV solo en una fila o ajustado */}
              <div className="input-group">
                <label>CVV (3 dígitos)</label>
                <input
                  type="text"
                  placeholder="123"
                  value={newCardCVV}
                  onChange={(e) => setNewCardCVV(e.target.value)}
                  maxLength="3" // AHORA MAXIMO 3
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="login-btn"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <div className="spinner"></div>
                  ) : (
                    "Guardar Tarjeta"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recargar (Sin cambios) */}
      {showRechargeModal && selectedCard && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="login-container modal-form"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={closeModal}>
              ×
            </button>
            <h2>Recargar Saldo</h2>
            <p className="modal-subtitle">
              Vas a recargar la tarjeta{" "}
              <strong>{maskCardNumber(selectedCard.numtarjeta)}</strong>.
            </p>
            <div className="current-balance-info">
              <span>Saldo Actual:</span>
              <strong>{formatCurrency(selectedCard.saldo)}</strong>
            </div>
            <form className="login-form" onSubmit={handleRechargeSubmit}>
              {formError && <div className="error-message">{formError}</div>}
              <div className="input-group">
                <label>Monto a Recargar (COP)</label>
                <input
                  type="number"
                  placeholder="Ej: 50000"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  min="1000"
                  step="1000"
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                  disabled={formLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="login-btn recharge-confirm-btn"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <div className="spinner"></div>
                  ) : (
                    "Confirmar Recarga"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
