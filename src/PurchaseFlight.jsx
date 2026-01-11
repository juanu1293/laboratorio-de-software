import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import apiService from "./apiService";
import "./App.css";
import "./PurchaseFlight.css";

const PurchaseFlight = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Usuario y vuelo
  const [userInfo, setUserInfo] = useState(null);
  const [flightData, setFlightData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Compra
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Tarjetas
  const [savedCards, setSavedCards] = useState([]);
  const [useSavedCard, setUseSavedCard] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);

  // Form (tarjeta nueva o cvv para tarjeta guardada)
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Estados
  const [selectedClass, setSelectedClass] = useState("economica");
  const [paymentMethod, setPaymentMethod] = useState("credito");

  console.log("=== PURCHASE FLIGHT DEBUG ===");
  console.log("location.state:", location.state);
  console.log("flightData:", flightData);
  console.log("selectedClass:", selectedClass);
  console.log("ticketQuantity:", ticketQuantity);
  console.log("totalPrice:", totalPrice);
  console.log("===========================");

  // ---------- FUNCIÓN PARA OBTENER FORMATO DE MÉTODO DE PAGO ----------
  const obtenerMetodoPagoParaBackend = (tipoTarjeta) => {
    console.log("🔍 Obteniendo formato para método de pago:", tipoTarjeta);

    const tipo = String(tipoTarjeta).toLowerCase().trim();

    // Intentar diferentes formatos (ordenados por probabilidad)
    const formatos = [
      { cuando: ["debito", "débito", "debit"], enviar: "debito" },
      { cuando: ["credito", "crédito", "credit"], enviar: "credito" },
      { cuando: ["debito", "débito", "debit"], enviar: "debito" },
      { cuando: ["credito", "crédito", "credit"], enviar: "credito" },
      { cuando: ["debito", "débito", "debit"], enviar: "debito" },
      { cuando: ["credito", "crédito", "credit"], enviar: "credito" },
    ];

    for (const formato of formatos) {
      if (formato.cuando.includes(tipo)) {
        console.log(`✅ Usando formato: '${formato.enviar}'`);
        return formato.enviar;
      }
    }

    console.log("⚠️  Usando valor por defecto: 'debito'");
    return "debito";
  };
  // ---------- FUNCIÓN PARA NORMALIZAR TIPO DE TARJETA ----------
  const normalizarTipoTarjeta = (tipo) => {
    console.log("🔄 Normalizando tipo de tarjeta:", tipo);

    if (!tipo) return "debito"; // Cambiado a mayúsculas

    tipo = String(tipo).toLowerCase().trim();

    if (tipo === "debito" || tipo === "débito" || tipo === "debit") {
      return "debito"; // MAYÚSCULAS
    }

    if (tipo === "credito" || tipo === "crédito" || tipo === "credit") {
      return "credito"; // MAYÚSCULAS
    }

    return "debito"; // MAYÚSCULAS
  };

  // ---------- FUNCIÓN PARA OBTENER ID CLIENTE ----------
  const obtenerIdCliente = (userInfo) => {
    if (!userInfo) {
      console.error("❌ userInfo no disponible");
      return null;
    }

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

    if (!idEncontrado) {
      console.error("❌ No se pudo encontrar ID del cliente en:", userInfo);
      return null;
    }

    console.log("✅ ID del cliente encontrado:", idEncontrado);
    return idEncontrado;
  };

  // ---------- OBTENER ID DE TIQUETE ----------
  const obtenerIdTiquete = () => {
    console.log("🔍 Buscando ID de tiquete...");
    console.log("🔍 flightData.backendData:", flightData?.backendData);

    if (flightData?.backendData?.tiquetesIds) {
      if (Array.isArray(flightData.backendData.tiquetesIds)) {
        if (flightData.backendData.tiquetesIds.length > 0) {
          const id = flightData.backendData.tiquetesIds[0];
          console.log("✅ ID de tiquete encontrado en array:", id);
          return id;
        }
      } else if (typeof flightData.backendData.tiquetesIds === "string") {
        const ids = flightData.backendData.tiquetesIds.split(", ");
        if (ids.length > 0) {
          console.log("✅ ID de tiquete encontrado en string:", ids[0]);
          return ids[0];
        }
      }
    }

    // Buscar en localStorage (carrito)
    try {
      const cart = JSON.parse(localStorage.getItem("vivasky_cart") || "[]");
      const currentReservation = cart.find(
        (item) => item.flightNumber === flightData?.flightNumber
      );

      if (currentReservation?.backendData?.tiquetesIds) {
        if (Array.isArray(currentReservation.backendData.tiquetesIds)) {
          if (currentReservation.backendData.tiquetesIds.length > 0) {
            const id = currentReservation.backendData.tiquetesIds[0];
            console.log("✅ ID de tiquete encontrado en carrito (array):", id);
            return id;
          }
        } else if (
          typeof currentReservation.backendData.tiquetesIds === "string"
        ) {
          const ids = currentReservation.backendData.tiquetesIds.split(", ");
          if (ids.length > 0) {
            console.log(
              "✅ ID de tiquete encontrado en carrito (string):",
              ids[0]
            );
            return ids[0];
          }
        }
      }
    } catch (error) {
      console.error("❌ Error buscando en carrito:", error);
    }

    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    console.log("⚠️ Generando ID temporal de tiquete:", tempId);
    return tempId;
  };

  // ---------- FUNCIÓN PARA MOSTRAR ID DE RESERVA EN UI ----------
  const mostrarIdReservaEnUI = () => {
    if (!flightData?.backendData?.tiquetesIds) return "";

    let idReserva = "";

    if (Array.isArray(flightData.backendData.tiquetesIds)) {
      idReserva = flightData.backendData.tiquetesIds[0] || "";
    } else if (typeof flightData.backendData.tiquetesIds === "string") {
      const ids = flightData.backendData.tiquetesIds.split(", ");
      idReserva = ids[0] || "";
    }

    return idReserva;
  };

  // ---------- CALCULAR PRECIO SEGURO ----------
  const calcularPrecioSeguro = () => {
    if (!flightData && location.state?.flight) {
      const flight = location.state.flight;
      return Number(flight.priceNumber) || 0;
    }

    if (flightData) {
      return Number(flightData.priceNumber) || 0;
    }

    return 0;
  };

  // ---------- UTILIDADES ----------
  const formatPrice = (price) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price || 0);

  const maskCardNumber = (num) => {
    if (!num) return "";
    const s = String(num);
    return `**** **** **** ${s.slice(-4)}`;
  };

  const handleCardNumChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 16) return;
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleDateChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 4) return;
    setExpiryDate(raw.length >= 3 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw);
  };

  // ---------- DEBUG FUNCTIONS ----------
  const debugFlightData = () => {
    console.log("=== DEBUG FLIGHT DATA ===");
    console.log("flightData:", flightData);
    if (flightData) {
      console.log(
        "costo_economico:",
        flightData.costo_economico,
        "Type:",
        typeof flightData.costo_economico
      );
      console.log(
        "costo_vip:",
        flightData.costo_vip,
        "Type:",
        typeof flightData.costo_vip
      );
      console.log(
        "priceNumber:",
        flightData.priceNumber,
        "Type:",
        typeof flightData.priceNumber
      );
      console.log("selectedClass:", selectedClass);
      console.log("returnFlight:", flightData.returnFlight);
      console.log("ticketQuantity:", ticketQuantity);

      const unitPrice = Number(flightData.priceNumber) || 0;
      const calculatedTotal = unitPrice * ticketQuantity;

      console.log("unitPrice:", unitPrice);
      console.log("calculatedTotal:", calculatedTotal);
      console.log("current totalPrice state:", totalPrice);
    }
    console.log("========================");
  };

  // ---------- INIT: usuario, vuelo, y tarjetas ----------
  useEffect(() => {
    const initData = async () => {
      console.log("🔄 INIT: Starting data initialization");

      const authToken =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      const userData =
        localStorage.getItem("userData") || sessionStorage.getItem("userData");

      if (!authToken || !userData) {
        console.log(
          "❌ INIT: No auth token or user data, redirecting to login"
        );
        navigate("/login");
        return;
      }

      try {
        const user = JSON.parse(userData);
        setUserInfo(user);
        console.log("✅ INIT: User info set:", user);
      } catch (err) {
        console.error("❌ INIT: Error parsing userData:", err);
        navigate("/login");
        return;
      }

      // Cargar tarjetas del backend
      try {
        console.log("🔄 INIT: Fetching cards from backend");
        const cards = await apiService.get("/cards");
        setSavedCards(cards || []);
        console.log("✅ INIT: Cards loaded:", cards?.length || 0);

        if ((cards || []).length === 0) {
          setUseSavedCard(false);
          console.log("ℹ️ INIT: No saved cards, switching to new card mode");
        } else {
          setUseSavedCard(true);
          console.log("ℹ️ INIT: Saved cards available, using saved card mode");
        }
      } catch (err) {
        console.error("❌ INIT: Error fetching cards:", err);
      }
    };

    // Cargar datos del vuelo desde navigation state
    console.log("🔄 INIT: Checking location state for flight data");
    if (location.state && location.state.flight) {
      const flight = location.state.flight;
      console.log("✅ INIT: Flight data from location:", flight);
      setFlightData(flight);

      if (flight.selectedClass) {
        setSelectedClass(flight.selectedClass);
        console.log(
          "ℹ️ INIT: Selected class from flight:",
          flight.selectedClass
        );
      }

      const forcedQuantity = 1;
      setTicketQuantity(forcedQuantity);
      console.log(
        "🔄 INIT: Forcing ticket quantity to:",
        forcedQuantity,
        "(original was:",
        flight.ticketQuantity,
        ")"
      );

      const unitPrice = Number(flight.priceNumber) || 0;
      const initialTotal = unitPrice * forcedQuantity;

      console.log("💰 INIT: Price calculation:", {
        unitPrice,
        initialTotal,
        quantity: forcedQuantity,
      });

      setTotalPrice(initialTotal);
      setLoading(false);
      console.log("✅ INIT: Flight data loaded successfully");

      console.log(
        "🔍 DEBUG flightData completo:",
        JSON.stringify(flight, null, 2)
      );
      console.log("🔍 DEBUG backendData:", flight.backendData);
    } else {
      console.log("❌ INIT: No flight data in location state");
      setLoading(false);
    }

    initData();
  }, [location, navigate]);

  // recalcular total cuando cambian clase / cantidad / flightData
  useEffect(() => {
    console.log("🔄 PRICE CALC: Recalculating total price");
    console.log("PRICE CALC - flightData:", flightData ? "exists" : "null");
    console.log("PRICE CALC - selectedClass:", selectedClass);
    console.log("PRICE CALC - ticketQuantity:", ticketQuantity);

    if (!flightData) {
      console.log("❌ PRICE CALC: No flight data, skipping calculation");
      if (location.state?.flight) {
        console.log("🔄 PRICE CALC: Using flight data from location state");
        const flight = location.state.flight;
        const unitPrice = Number(flight.priceNumber) || 0;
        const newTotal = unitPrice * ticketQuantity;
        setTotalPrice(newTotal);
      }
      return;
    }

    const unitPrice = Number(flightData.priceNumber) || 0;
    const newTotal = unitPrice * ticketQuantity;

    console.log("💰 PRICE CALC: New calculation:", {
      unitPrice,
      ticketQuantity,
      newTotal,
    });

    setTotalPrice(newTotal);
    console.log("✅ PRICE CALC: Total price updated to:", newTotal);

    setTimeout(debugFlightData, 100);
  }, [selectedClass, ticketQuantity, flightData, location.state]);

  // cambio de cantidad
  const handleQuantityChange = (newQty) => {
    const qty = Number(newQty);
    console.log("🔄 QUANTITY CHANGE: New quantity:", qty);

    if (!qty || qty < 1) {
      console.log("❌ QUANTITY CHANGE: Invalid quantity");
      return;
    }
    if (qty > 5) {
      console.log("❌ QUANTITY CHANGE: Quantity exceeds limit (5)");
      return;
    }
    setTicketQuantity(qty);
    console.log("✅ QUANTITY CHANGE: Quantity updated to:", qty);
  };

  // seleccionar tarjeta guardada
  const handleSelectCard = (card) => {
    console.log("💳 CARD SELECT: Selected card:", card);
    setSelectedCard(card);
    setCvv("");
  };

  // ---------- VALIDACIONES DE PAGO ----------
  const validatePayment = () => {
    console.log("🔄 VALIDATION: Starting payment validation");

    if (!flightData && !location.state?.flight) {
      setErrorMsg("No hay información del vuelo.");
      return false;
    }
    if (!userInfo) {
      setErrorMsg("Usuario no autenticado.");
      return false;
    }

    if (useSavedCard) {
      console.log("💳 VALIDATION: Validating saved card");

      if (!selectedCard) {
        setErrorMsg("Selecciona una tarjeta guardada.");
        return false;
      }

      if (!cvv || cvv.length !== 3) {
        setErrorMsg("Ingresa un CVV válido (3 dígitos).");
        return false;
      }

      if (String(cvv) !== String(selectedCard.cvv)) {
        setErrorMsg("CVV incorrecto.");
        return false;
      }

      console.log("✅ VALIDATION: Saved card validation passed");
    } else {
      console.log("💳 VALIDATION: Validating new card");

      if (!cardNumber || !cardName || !expiryDate || !cvv) {
        setErrorMsg("Todos los campos de la tarjeta son obligatorios.");
        return false;
      }

      if (cardNumber.replace(/\s/g, "").length !== 16) {
        setErrorMsg("El número de tarjeta debe tener 16 dígitos.");
        return false;
      }

      if (cvv.length !== 3) {
        setErrorMsg("El CVV debe tener 3 dígitos.");
        return false;
      }

      const [month, year] = expiryDate.split("/");
      if (!month || !year || month.length !== 2 || year.length !== 2) {
        setErrorMsg("La fecha de expiración debe tener el formato MM/AA.");
        return false;
      }

      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      const expMonth = parseInt(month);
      const expYear = parseInt(year);

      if (expMonth < 1 || expMonth > 12) {
        setErrorMsg("El mes de expiración debe estar entre 01 y 12.");
        return false;
      }

      if (
        expYear < currentYear ||
        (expYear === currentYear && expMonth < currentMonth)
      ) {
        setErrorMsg("La tarjeta está expirada.");
        return false;
      }

      console.log("✅ VALIDATION: New card validation passed");
    }

    return true;
  };

  // ---------- NUEVA FUNCIÓN MEJORADA: PROCESAR PAGO ----------
  const procesarPago = async (cardData) => {
    console.log("💳 PROCESAR PAGO: Iniciando proceso de pago", cardData);

    try {
      // Si es tarjeta nueva, intentar guardarla (opcional)
      if (!useSavedCard) {
        console.log("🔄 Intentando guardar nueva tarjeta...");

        const newCardPayload = {
          numtarjeta: cardData.numtarjeta,
          nombrepersona: cardData.nombrepersona,
          fecha_expiracion: cardData.fecha_expiracion,
          cvv: cardData.cvv,
          tipo: cardData.tipo,
          saldo: 1000000,
        };

        try {
          const cardResponse = await apiService.post("/cards", newCardPayload);
          console.log("✅ Nueva tarjeta guardada:", cardResponse);
        } catch (cardError) {
          // Si la tarjeta ya existe, está bien
          console.log(
            "ℹ️ Tarjeta ya existe o error al guardar:",
            cardError.message
          );
        }
      }

      return { success: true, message: "Tarjeta validada correctamente" };
    } catch (error) {
      console.error("❌ Error procesando tarjeta:", error);
      // Continuamos de todos modos, el backend verificará la tarjeta
      return {
        success: true,
        message: "Continuando con pago, tarjeta será verificada por backend",
      };
    }
  };

  // ---------- FUNCIÓN MEJORADA PARA MANEJAR ERRORES DEL BACKEND ----------
  const manejarErrorBackend = async (error, endpoint) => {
    console.error(`❌ Error en ${endpoint}:`, error);

    let mensajeError = "Error desconocido en el servidor";

    try {
      // Intentar obtener más detalles del error
      if (error.message && error.message.includes("500")) {
        mensajeError =
          "Error 500 - Problema interno del servidor\n\n" +
          "Revisa la consola del backend para ver detalles.";
      } else if (error.message && error.message.includes("Network Error")) {
        mensajeError =
          "Error de conexión con el servidor\n\n" +
          "Verifica que el backend esté corriendo en http://localhost:5000";
      } else {
        mensajeError = error.message || "Error en el servidor";
      }

      // Intentar hacer un GET simple para diagnosticar
      try {
        const testResponse = await fetch(
          "http://localhost:5000/api/compra/pagar",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        console.log(
          "🔍 Test GET a /compra/pagar - Status:",
          testResponse.status
        );
      } catch (testError) {
        console.error("❌ Test GET falló:", testError);
      }
    } catch (parseError) {
      console.error("❌ Error parseando respuesta de error:", parseError);
    }

    return mensajeError;
  };

  // ---------- PROCESAR COMPRA MEJORADA ----------
  const handleProcessPurchase = async () => {
    console.log("🔄 PURCHASE: Starting purchase process");
    setErrorMsg("");
    setIsProcessing(true);

    try {
      // 1. Validar pago antes de procesar
      if (!validatePayment()) {
        setIsProcessing(false);
        return;
      }

      console.log("✅ PURCHASE: Payment validation passed");

      // 2. Obtener IDs necesarios
      const userId = obtenerIdCliente(userInfo);
      const idtiquete = obtenerIdTiquete();

      if (!userId) {
        throw new Error(
          "No se pudo identificar al usuario. Por favor, inicia sesión nuevamente."
        );
      }

      console.log(
        "🎫 PURCHASE: IDs obtenidos - User:",
        userId,
        "Tiquete:",
        idtiquete
      );

      // 3. Preparar datos de tarjeta
      let cardData = {};
      const precioFinal = totalPrice || calcularPrecioSeguro() * ticketQuantity;

      if (useSavedCard) {
        cardData = {
          numtarjeta: selectedCard.numtarjeta,
          nombrepersona: selectedCard.nombrepersona,
          fecha_expiracion: selectedCard.fecha_expiracion,
          cvv: cvv,
          tipo: normalizarTipoTarjeta(selectedCard.tipo), // Usar función normalizada
        };
      } else {
        cardData = {
          numtarjeta: cardNumber.replace(/\s/g, ""),
          nombrepersona: cardName,
          fecha_expiracion: expiryDate,
          cvv: cvv,
          tipo: normalizarTipoTarjeta(paymentMethod), // Usar función normalizada
        };
      }

      console.log("💳 Datos de tarjeta preparados:", cardData);

      // 4. Validar/registrar tarjeta si es nueva (opcional)
      try {
        await procesarPago(cardData);
        console.log("✅ Tarjeta procesada correctamente");
      } catch (cardError) {
        console.log("⚠️ Error con tarjeta, continuando:", cardError.message);
      }

      // ✅✅✅ CORRECCIÓN CRÍTICA AQUÍ ✅✅✅
      // 5. CREAR LA COMPRA EN EL BACKEND - ENVIAR TIPO DE TARJETA
      const purchasePayload = {
        idcliente: userId,
        idtiquete: idtiquete,
        numtarjeta: cardData.numtarjeta,
        metodopago: obtenerMetodoPagoParaBackend(cardData.tipo),
      };

      console.log("📦 PURCHASE: Sending to /compra/pagar:", purchasePayload);
      console.log("ℹ️ NOTA: Se envía 'metodopago' con valor:", cardData.tipo);

      let paymentResult;
      try {
        const response = await fetch("http://localhost:5000/api/compra/pagar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              localStorage.getItem("authToken") ||
              sessionStorage.getItem("authToken")
            }`,
          },
          body: JSON.stringify(purchasePayload),
        });

        console.log("📊 Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Error response text:", errorText);

          let errorJson;
          try {
            errorJson = JSON.parse(errorText);
          } catch {
            errorJson = { mensaje: errorText || `Error ${response.status}` };
          }

          // Mensaje de error más específico para CHECK constraint
          let errorMessage = errorJson.mensaje || "Error al procesar el pago";

          if (
            errorMessage.includes("pago_metodopago_check") ||
            errorMessage.includes("CHECK")
          ) {
            errorMessage =
              "❌ ERROR: Problema con el tipo de tarjeta.\n\n" +
              "La base de datos rechazó el tipo de tarjeta enviado.\n" +
              "Tipo enviado: '" +
              cardData.tipo +
              "'\n" +
              "La base de datos espera valores específicos para 'metodopago'.\n\n" +
              "Valor actual enviado: " +
              cardData.tipo;
          }

          throw new Error(errorMessage);
        }

        paymentResult = await response.json();
        console.log(
          "✅ PURCHASE: Purchase processed successfully:",
          paymentResult
        );

        if (!paymentResult || !paymentResult.mensaje) {
          throw new Error("Respuesta inválida del servidor");
        }
      } catch (endpointError) {
        console.error("❌ Error con /compra/pagar:", endpointError);

        let errorMessage = endpointError.message || "Error desconocido";

        // Mensaje específico para CHECK constraint
        if (
          errorMessage.includes("pago_metodopago_check") ||
          errorMessage.includes("CHECK")
        ) {
          errorMessage =
            "❌ ERROR CRÍTICO: Problema con tipo de tarjeta\n\n" +
            "La base de datos tiene una restricción CHECK en la columna 'metodopago'.\n" +
            "Se envió: '" +
            cardData.tipo +
            "'\n\n" +
            "Posibles soluciones:\n" +
            "1. El frontend está enviando: " +
            cardData.tipo +
            "\n" +
            "2. Verificar qué valores acepta la base de datos\n" +
            "3. Ajustar la función 'normalizarTipoTarjeta' si es necesario";
        }

        throw new Error(errorMessage);
      }

      // 6. Éxito - Mostrar confirmación y limpiar carrito
      setIsProcessing(false);
      console.log(
        "🎉 PURCHASE: Purchase completed successfully!",
        paymentResult
      );

      // 7. Eliminar la reserva del carrito local
      try {
        const currentCart = JSON.parse(
          localStorage.getItem("vivasky_cart") || "[]"
        );
        const updatedCart = currentCart.filter(
          (item) =>
            item.flightNumber !==
            (flightData?.flightNumber || location.state?.flight?.flightNumber)
        );
        localStorage.setItem("vivasky_cart", JSON.stringify(updatedCart));
        console.log("🗑️ PURCHASE: Reservation removed from local cart");

        window.dispatchEvent(new Event("vivasky-cart-changed"));
      } catch (cartErr) {
        console.warn("⚠️ PURCHASE: Error removing from local cart:", cartErr);
      }

      // 8. Mostrar alerta de éxito
      const successMessage = `¡Pago y compra completados con éxito! ✅

📋 Resumen de Compra:
✈️ Vuelo: ${flightData?.flightNumber || location.state?.flight?.flightNumber}
🛫 Aerolínea: ${flightData?.airline || location.state?.flight?.airline}
🎫 Clase: ${selectedClass === "vip" ? "⭐ VIP" : "💺 Económica"}
🎟️ Cantidad: ${ticketQuantity} tiquete(s)
💰 Total Pagado: ${formatPrice(precioFinal)}
💳 Tarjeta: ****${cardData.numtarjeta.slice(-4)} (${
        cardData.tipo === "credito" ? "Crédito" : "Débito"
      })
🔢 ID Transacción: ${
        paymentResult.idtransaccion || paymentResult.idpago || "N/A"
      }
📅 Fecha: ${new Date().toLocaleDateString("es-CO")}

📧 Se ha enviado un correo de confirmación a tu email.
📱 Puedes ver tus reservas en "Mis Reservas".

¡Gracias por tu compra! 🎉`;

      alert(successMessage);

      // 9. Redirigir a la página de mis reservas
      navigate("/my-purchases", {
        state: {
          purchaseSuccess: true,
          reservation: paymentResult,
          flight: flightData || location.state?.flight,
          purchaseDetails: {
            total: precioFinal,
            ticketQuantity: ticketQuantity,
            selectedClass: selectedClass,
            paymentMethod: useSavedCard ? "Tarjeta Guardada" : "Nueva Tarjeta",
            cardType: cardData.tipo === "credito" ? "Crédito" : "Débito",
            transactionId:
              paymentResult.idtransaccion ||
              paymentResult.idpago ||
              Date.now().toString(),
            cardLastDigits: cardData.numtarjeta.slice(-4),
            purchaseDate: new Date().toISOString(),
          },
        },
        replace: true,
      });
    } catch (err) {
      console.error("❌ PURCHASE: Purchase failed:", err);
      setErrorMsg(err.message);
      setIsProcessing(false);
    }
  };

  // ---------- RENDER ----------
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
          <p>Cargando información de compra...</p>
        </div>
      </div>
    );
  }

  if (!flightData && !location.state?.flight) {
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
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h2>Error al cargar la información del vuelo.</h2>
          <button className="back-btn" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  console.log("🎨 RENDER: Rendering component with current state");
  debugFlightData();

  const currentFlight = flightData || location.state?.flight;
  const precioUnitario = calcularPrecioSeguro();
  const totalCalculado = totalPrice || precioUnitario * ticketQuantity;
  const idReserva = mostrarIdReservaEnUI();

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
        <button className="back-btn" onClick={() => navigate(-1)}>
          Volver
        </button>
      </header>

      <div className="purchase-container">
        <div className="purchase-header">
          <h1>🎫 Finalizar Compra</h1>
          <p>Completa tu información de pago para confirmar la compra</p>
        </div>

        <div className="purchase-layout">
          {/* IZQUIERDA - Info vuelo */}
          <div className="purchase-flight-info">
            <div className="info-card">
              <h3>✈️ Información del Vuelo</h3>

              <div className="flight-summary">
                <div className="route-summary">
                  <div className="cities">
                    <span className="city-from">
                      {currentFlight?.departure?.city}
                    </span>
                    <span className="arrow">→</span>
                    <span className="city-to">
                      {currentFlight?.arrival?.city}
                    </span>
                  </div>
                  <div className="dates">
                    <div className="date-section">
                      <strong>Salida:</strong> {currentFlight?.departure?.date}
                    </div>
                    {currentFlight?.returnFlight && (
                      <div className="date-section">
                        <strong>Retorno:</strong>{" "}
                        {currentFlight.returnFlight.departure?.date}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flight-details">
                  <div className="detail-item">
                    <span>Aerolínea:</span>
                    <span>{currentFlight?.airline}</span>
                  </div>
                  <div className="detail-item">
                    <span>Número de vuelo:</span>
                    <span>{currentFlight?.flightNumber}</span>
                  </div>
                  <div className="detail-item">
                    <span>Clase:</span>
                    <span className="class-badge">
                      {selectedClass === "vip" ? "⭐ VIP" : "💺 Económica"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span>Cantidad de tiquetes:</span>
                    <span>{ticketQuantity}</span>
                  </div>

                  <div className="detail-item debug-info">
                    <span>Precio Unitario:</span>
                    <span>{formatPrice(precioUnitario)}</span>
                  </div>

                  {idReserva && (
                    <div className="detail-item debug-info">
                      <span>ID de Reserva:</span>
                      <span className="reservation-id">{idReserva}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* DERECHA - Pago */}
          <div className="purchase-payment-info">
            <div className="payment-card">
              <h3>💳 Información de Pago</h3>

              {/* Toggle Mis Tarjetas / Nueva */}
              <div className="payment-method-toggle">
                <button
                  className={`toggle-btn ${useSavedCard ? "active" : ""}`}
                  onClick={() => {
                    setUseSavedCard(true);
                    setSelectedCard(null);
                    setCvv("");
                  }}
                  disabled={savedCards.length === 0}
                >
                  Mis Tarjetas Guardadas
                </button>
                <button
                  className={`toggle-btn ${!useSavedCard ? "active" : ""}`}
                  onClick={() => {
                    setUseSavedCard(false);
                    setSelectedCard(null);
                    setCvv("");
                  }}
                >
                  Usar Nueva Tarjeta
                </button>
              </div>

              {errorMsg && (
                <div className="error-alert detailed">
                  <div className="error-header">
                    <span className="error-icon">❌</span>
                    <strong>Error en el pago</strong>
                  </div>
                  <div className="error-message">
                    {errorMsg.split("\n").map((line, i) => (
                      <p key={i} style={{ margin: "5px 0" }}>
                        {line}
                      </p>
                    ))}
                  </div>
                  <div className="error-actions">
                    <button
                      className="error-retry-btn"
                      onClick={() => setErrorMsg("")}
                    >
                      Intentar de nuevo
                    </button>
                    <button
                      className="error-debug-btn"
                      onClick={() => {
                        console.log("🔍 DEBUG: Current state:", {
                          flightData,
                          userInfo,
                          selectedCard,
                          purchasePayload: {
                            idcliente: obtenerIdCliente(userInfo),
                            idtiquete: obtenerIdTiquete(),
                            numtarjeta:
                              selectedCard?.numtarjeta ||
                              cardNumber.replace(/\s/g, ""),
                            metodopago: normalizarTipoTarjeta(
                              selectedCard?.tipo || paymentMethod
                            ),
                          },
                        });
                        alert("Revisa la consola para detalles de debug");
                      }}
                    >
                      Ver detalles técnicos
                    </button>
                  </div>
                </div>
              )}

              {/* OPCIÓN A: tarjetas guardadas */}
              {useSavedCard ? (
                <div className="saved-cards-container">
                  {savedCards.length > 0 ? (
                    <>
                      <p className="section-instruction">
                        Selecciona la tarjeta que deseas usar:
                      </p>
                      <div className="saved-cards-list">
                        {savedCards.map((card) => (
                          <div
                            key={card.idtarjeta}
                            className={`saved-card-item ${
                              selectedCard?.idtarjeta === card.idtarjeta
                                ? "selected"
                                : ""
                            }`}
                            onClick={() => handleSelectCard(card)}
                          >
                            <div className="card-info-display">
                              <div>
                                <strong>
                                  {maskCardNumber(card.numtarjeta)}
                                </strong>{" "}
                                <span className="card-owner">
                                  {card.nombrepersona}
                                </span>
                              </div>
                              <div className="card-meta">
                                <span>
                                  {card.tipo === "credito" ||
                                  card.tipo === "credito"
                                    ? "Crédito"
                                    : "Débito"}
                                </span>
                                <span> • Exp: {card.fecha_expiracion}</span>
                              </div>
                            </div>
                            <div className="card-balance">
                              Saldo: {formatPrice(Number(card.saldo || 0))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedCard && (
                        <div className="cvv-verification-box">
                          <label>Ingresa el CVV para confirmar el pago</label>
                          <div className="cvv-input-wrapper">
                            <input
                              type="password"
                              placeholder="123"
                              maxLength="3"
                              value={cvv}
                              onChange={(e) =>
                                setCvv(
                                  e.target.value.replace(/\D/g, "").slice(0, 3)
                                )
                              }
                              autoFocus
                            />
                            <span className="cvv-hint">
                              3 dígitos al reverso de la tarjeta
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="no-cards-message">
                      No tienes tarjetas guardadas. Usa "Usar Nueva Tarjeta"
                      para pagar.
                    </p>
                  )}
                </div>
              ) : (
                // OPCIÓN B: tarjeta nueva
                <div className="new-card-form">
                  <div className="input-group">
                    <label>Número de Tarjeta</label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={handleCardNumChange}
                      maxLength={19}
                    />
                  </div>
                  <div className="input-group">
                    <label>Nombre del Titular</label>
                    <input
                      type="text"
                      placeholder="COMO APARECE EN LA TARJETA"
                      value={cardName}
                      onChange={(e) =>
                        setCardName(e.target.value.toUpperCase())
                      }
                    />
                  </div>

                  <div className="form-row">
                    <div className="input-group">
                      <label>Expiración (MM/AA)</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        value={expiryDate}
                        onChange={handleDateChange}
                        maxLength={5}
                      />
                    </div>
                    <div className="input-group">
                      <label>CVV</label>
                      <input
                        type="password"
                        placeholder="123"
                        maxLength="3"
                        value={cvv}
                        onChange={(e) =>
                          setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
                        }
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Tipo de Tarjeta</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="credito">Crédito</option>
                      <option value="debito">Débito</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Resumen */}
              <div className="payment-summary">
                <h4>Resumen de Pago</h4>
                <div className="summary-items">
                  <div className="summary-item">
                    <span>
                      Vuelo{" "}
                      {currentFlight?.returnFlight
                        ? "(Ida y Vuelta)"
                        : "(Solo Ida)"}
                      :
                    </span>
                    <span>
                      {selectedClass === "vip" ? "⭐ VIP" : "💺 Económica"}
                    </span>
                  </div>

                  <div className="summary-item">
                    <span>Cantidad:</span>
                    <span>{ticketQuantity} tiquete(s)</span>
                  </div>

                  <div className="summary-item">
                    <span>Precio unitario:</span>
                    <span>{formatPrice(precioUnitario)}</span>
                  </div>

                  <div className="summary-divider"></div>

                  <div className="summary-total">
                    <span>Total a Pagar:</span>
                    <span className="total-amount">
                      {formatPrice(totalCalculado)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón de pago */}
              <button
                className={`purchase-btn ${isProcessing ? "processing" : ""}`}
                onClick={handleProcessPurchase}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="spinner-small"></div>
                    Procesando Pago...
                  </>
                ) : (
                  `Pagar ${formatPrice(totalCalculado)}`
                )}
              </button>

              <div className="security-notice">
                <span className="lock-icon">🔒</span>
                <span>Tu pago está protegido con encriptación SSL</span>
              </div>

              {/* Información de debug para el usuario */}
              <div
                className="debug-info-box"
                style={{
                  marginTop: "20px",
                  padding: "10px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "5px",
                  fontSize: "12px",
                  color: "#666",
                }}
              >
                <strong>🔧 Información Técnica:</strong>
                <div>ID Cliente: {obtenerIdCliente(userInfo)}</div>
                <div>ID Tiquete: {obtenerIdTiquete()}</div>
                <div>Endpoint: POST /api/compra/pagar</div>
                <div>
                  Tipo tarjeta enviado:{" "}
                  {normalizarTipoTarjeta(selectedCard?.tipo || paymentMethod)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseFlight;
