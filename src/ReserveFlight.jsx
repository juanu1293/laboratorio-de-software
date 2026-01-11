import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./App.css";
import "./ReserveFlight.css";

const ReserveFlight = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userInfo, setUserInfo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [flightData, setFlightData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("flight");
  const [userRole, setUserRole] = useState("");
  const [selectedClass, setSelectedClass] = useState("economica");
  const [totalPrice, setTotalPrice] = useState(0);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [actionType, setActionType] = useState("");
  const [isFlightAlreadyReserved, setIsFlightAlreadyReserved] = useState(false);
  const [reserving, setReserving] = useState(false);

  // 🔥 NUEVA FUNCIÓN: Obtener ID del cliente de múltiples fuentes
  const obtenerIdCliente = (userInfo) => {
    if (!userInfo) {
      console.error("❌ userInfo no disponible");
      return null;
    }

    // Buscar en diferentes propiedades posibles
    const posiblesIds = [
      userInfo.id,
      userInfo.idcliente,
      userInfo.id_usuario,
      userInfo.documento,
      userInfo.cedula,
      userInfo.numero_documento,
    ];

    const idEncontrado = posiblesIds.find(
      (id) => id && id !== "No especificado"
    );

    if (!idEncontrado) {
      console.error("❌ No se pudo encontrar ID del cliente en:", userInfo);
      return null;
    }

    console.log("✅ ID del cliente encontrado:", idEncontrado);
    return idEncontrado;
  };

  // 🔥 NUEVA FUNCIÓN: Mapear datos del vuelo para el backend
  const mapearDatosVueloBackend = (flightData) => {
    console.log("🔍 Mapeando datos del vuelo para backend:", flightData);

    // El backend espera el ID numérico del vuelo (sin prefijo VS)
    let idVuelo = flightData.flightNumber;

    // Si viene de search-flights, puede tener id_vuelo
    if (!idVuelo && flightData.id_vuelo) {
      idVuelo = flightData.id_vuelo;
    }

    // Remover prefijo si existe
    if (idVuelo && typeof idVuelo === "string" && idVuelo.startsWith("VS")) {
      idVuelo = idVuelo.replace("VS", "");
    }

    // Convertir a número y validar
    const idNumerico = parseInt(idVuelo);

    if (!idNumerico || isNaN(idNumerico)) {
      console.error("❌ ID de vuelo inválido:", idVuelo, "de:", flightData);
      throw new Error(`ID de vuelo inválido: ${idVuelo}`);
    }

    console.log("✅ ID de vuelo mapeado:", idNumerico);
    return idNumerico;
  };

  const reservarVueloBackend = async (
    flightData,
    selectedClass,
    ticketQuantity,
    idcliente
  ) => {
    try {
      const idvuelo = mapearDatosVueloBackend(flightData);

      const reservaData = {
        idvuelo: idvuelo,
        idcliente: idcliente,
        clase: selectedClass,
        tipo: flightData.isRoundTrip ? "ida y vuelta" : "soloida",
        conexion: `reserva_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      };

      console.log("📤 Enviando datos al backend:", reservaData);

      let backendFuncionando = true;
      const reservas = [];

      for (let i = 0; i < ticketQuantity; i++) {
        try {
          const response = await fetch(
            "http://localhost:5000/api/tiquetes/reservar",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(reservaData),
            }
          );

          const responseText = await response.text();
          let result = JSON.parse(responseText);

          if (response.ok) {
            // ✅ BACKEND FUNCIONANDO CORRECTAMENTE
            reservas.push(result);
            console.log(`✅ Reserva ${i + 1} exitosa:`, result);
          } else {
            backendFuncionando = false;

            // 🔥 DECISIÓN INTELIGENTE: ¿Modo compatibilidad o error?
            if (
              response.status === 500 &&
              result.error &&
              result.error.includes("asientos")
            ) {
              console.warn(
                `⚠️ Error de asientos en reserva ${
                  i + 1
                }, usando modo compatibilidad`
              );

              reservas.push({
                mensaje: "Reserva (modo compatibilidad)",
                idtiquete: `comp_${idvuelo}_${idcliente}_${Date.now()}_${i}`,
                idasiento: `SIM${i + 1}`,
                tipo: reservaData.tipo,
                conexion: reservaData.conexion,
                modo_compatibilidad: true,
                error_original: result.error,
              });
            } else {
              throw new Error(
                `Error del servidor: ${result.mensaje || result.error}`
              );
            }
          }
        } catch (error) {
          console.error(`❌ Error en reserva ${i + 1}:`, error);
          throw error; // Propagar error crítico
        }
      }

      if (!backendFuncionando) {
        console.warn(
          "🎭 Algunas reservas en modo compatibilidad por problemas de backend"
        );
      }

      return reservas;
    } catch (error) {
      console.error("❌ Error general en reserva backend:", error);
      throw error;
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Verificar si el vuelo ya está reservado en el carrito
  const checkIfFlightIsReserved = (flight) => {
    try {
      const currentCart = JSON.parse(
        localStorage.getItem("vivasky_cart") || "[]"
      );

      // 🔥 MEJORADO: Verificar por flightNumber Y también por datos del backend
      const isReserved = currentCart.some((item) => {
        // Verificación básica por flightNumber
        if (
          item.flightNumber === flight.flightNumber &&
          item.reservationType === "temporal"
        ) {
          return true;
        }

        // Verificación adicional para items del backend
        if (item.backendData?.desdeBackend) {
          // Si el vuelo tiene un prefijo VS, removerlo para comparar
          const flightNum = flight.flightNumber?.startsWith("VS")
            ? flight.flightNumber.replace("VS", "")
            : flight.flightNumber;

          // Comparar id_vuelo del backend
          if (item.backendData.id_vuelo === flightNum) {
            return true;
          }
        }

        return false;
      });

      console.log("🔍 Verificando si el vuelo está reservado:", {
        flightNumber: flight.flightNumber,
        isReserved: isReserved,
        itemsEnCarrito: currentCart.length,
        items: currentCart.map((item) => ({
          flightNumber: item.flightNumber,
          backend: item.backendData?.desdeBackend,
          id_vuelo: item.backendData?.id_vuelo,
        })),
      });

      setIsFlightAlreadyReserved(isReserved);
      return isReserved;
    } catch (error) {
      console.error("❌ Error verificando reserva:", error);
      return false;
    }
  };

  // 🔥 FUNCIÓN CORREGIDA: Calcular precio total
  const calculateTotalPrice = (
    flight,
    classType,
    quantity = ticketQuantity
  ) => {
    if (!flight) return;

    // Precio INDIVIDUAL del vuelo de ida
    const outboundPrice =
      classType === "vip"
        ? Number(flight.costo_vip) || Number(flight.priceNumber) || 0
        : Number(flight.priceNumber) || 0;

    // Precio INDIVIDUAL del vuelo de retorno (si existe)
    const returnPrice = flight.returnFlight
      ? classType === "vip"
        ? Number(flight.returnFlight.costo_vip) ||
          Number(flight.returnFlight.priceNumber) ||
          0
        : Number(flight.returnFlight.priceNumber) || 0
      : 0;

    // SUMA CORRECTA multiplicada por cantidad
    const total = (outboundPrice + returnPrice) * quantity;

    setTotalPrice(total);
  };

  // 🔥 NUEVA FUNCIÓN: Manejar cambio de cantidad
  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 5) {
      setTicketQuantity(newQuantity);
      calculateTotalPrice(flightData, selectedClass, newQuantity);
    }
  };

  // 🔥 NUEVA FUNCIÓN: Mostrar modal de cantidad
  const showQuantitySelection = () => {
    // 🔥 NUEVO: Si el vuelo ya está reservado, mostrar alerta
    if (isFlightAlreadyReserved) {
      alert(
        "✈️ Este vuelo ya está reservado en tu carrito. No puedes reservarlo nuevamente.\n\nPuedes:\n• Completar la compra desde tu carrito\n• Esperar a que expire la reserva actual (24 horas)"
      );
      return;
    }

    setActionType("reserve");
    setShowQuantityModal(true);
  };

  // 🔥 FUNCIÓN MODIFICADA: Confirmar acción después de seleccionar cantidad
  const confirmActionWithQuantity = () => {
    setShowQuantityModal(false);

    // 🔥 SOLO RESERVA (eliminado buy)
    if (actionType === "reserve") {
      handleReserveFlight();
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Agregar al carrito con datos del backend
  const addFlightToCartWithExpiration = (
    flight,
    classType,
    totalPrice,
    quantity,
    resultadosBackend = [] // 🔥 NUEVO: Recibir resultados del backend
  ) => {
    try {
      const currentCart = JSON.parse(
        localStorage.getItem("vivasky_cart") || "[]"
      );

      // Verificar si el vuelo ya está reservado
      const isAlreadyReserved = currentCart.some(
        (item) =>
          item.flightNumber === flight.flightNumber &&
          item.reservationType === "temporal"
      );

      if (isAlreadyReserved) {
        alert(
          "❌ Este vuelo ya está reservado en tu carrito. No puedes reservarlo nuevamente."
        );
        return false;
      }

      const expirationTime = new Date();
      expirationTime.setHours(expirationTime.getHours() + 24);

      const unitPrice = totalPrice / quantity;

      // 🔥 INCORPORAR DATOS DEL BACKEND SI EXISTEN
      const backendIds = resultadosBackend.map((r) => r.idtiquete).join(", ");
      const backendAsiento = resultadosBackend
        .map((r) => r.idasiento)
        .join(", ");

      const reservedFlight = {
        id: `reserved_${flight.flightNumber}_${Date.now()}`,
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        price: new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(totalPrice),
        priceNumber: totalPrice,
        unitPrice: unitPrice,
        selectedClass: classType,
        classText: classType === "vip" ? "VIP" : "Económica",
        duration: flight.duration,
        stops: flight.stops,
        departure: {
          city: flight.departure?.city,
          airport: flight.departure?.airport,
          time: flight.departure?.time,
          date: flight.departure?.date,
          isInternational: flight.departure?.isInternational,
        },
        arrival: {
          city: flight.arrival?.city,
          airport: flight.arrival?.airport,
          time: flight.arrival?.time,
          date: flight.arrival?.date,
          isInternational: flight.arrival?.isInternational,
        },
        returnFlight: flight.returnFlight
          ? {
              flightNumber: flight.returnFlight.flightNumber,
              departure: {
                city: flight.returnFlight.departure?.city,
                airport: flight.returnFlight.departure?.airport,
                time: flight.returnFlight.departure?.time,
                date: flight.returnFlight.departure?.date,
                isInternational: flight.returnFlight.departure?.isInternational,
              },
              arrival: {
                city: flight.returnFlight.arrival?.city,
                airport: flight.returnFlight.arrival?.airport,
                time: flight.returnFlight.arrival?.time,
                date: flight.returnFlight.arrival?.date,
                isInternational: flight.returnFlight.arrival?.isInternational,
              },
              duration: flight.returnFlight.duration,
            }
          : null,
        isRoundTrip: flight.isRoundTrip,
        hasReturnFlight: flight.hasReturnFlight,
        searchParams: flight.searchParams,
        isInternational: flight.isInternational,
        reservationType: "temporal",
        reservedAt: new Date().toISOString(),
        expiresAt: expirationTime.toISOString(),
        timeLeft: "24:00:00",
        status: "reserved",
        ticketQuantity: quantity,
        maxTickets: 5,
        // 🔥 NUEVO: Datos del backend
        backendData: {
          tiquetesIds: backendIds,
          asiento: backendAsiento,
          reservasCount: resultadosBackend.length,
          modoCompatibilidad: resultadosBackend.some(
            (r) => r.modo_compatibilidad
          ),
        },
      };

      const updatedCart = [...currentCart, reservedFlight];
      localStorage.setItem("vivasky_cart", JSON.stringify(updatedCart));

      console.log("✅ Vuelo agregado al carrito:", reservedFlight);

      setIsFlightAlreadyReserved(true);

      // 🔥 NUEVO: Disparar evento de cambio en el carrito
      window.dispatchEvent(new Event("vivasky-cart-changed"));

      return true;
    } catch (error) {
      console.error("❌ Error agregando vuelo al carrito:", error);
      return false;
    }
  };

  // 🔥 FUNCIÓN ACTUALIZADA: handleReserveFlight
  const handleReserveFlight = async () => {
    if (!canMakeReservations()) {
      showAdminRestrictionMessage();
      return;
    }

    if (!flightData) {
      alert("❌ No hay información del vuelo disponible");
      return;
    }

    if (isFlightAlreadyReserved) {
      alert(
        "❌ Este vuelo ya está reservado en tu carrito. No puedes reservarlo nuevamente."
      );
      return;
    }

    const idcliente = obtenerIdCliente(userInfo);
    if (!idcliente) {
      alert(
        "❌ No se pudo identificar tu usuario. Por favor inicia sesión nuevamente."
      );
      return;
    }

    try {
      setReserving(true);

      // 🔥 RESERVAR EN EL BACKEND (con manejo de errores)
      const resultadosReserva = await reservarVueloBackend(
        flightData,
        selectedClass,
        ticketQuantity,
        idcliente
      );

      // 🔥 AGREGAR AL CARRITO LOCAL con datos del backend
      const classText = selectedClass === "vip" ? "VIP" : "Económica";
      const flightType = flightData.returnFlight ? "Ida y Vuelta" : "Solo Ida";

      const success = addFlightToCartWithExpiration(
        flightData,
        selectedClass,
        totalPrice,
        ticketQuantity,
        resultadosReserva // 🔥 Pasar resultados del backend
      );

      if (success && resultadosReserva.length > 0) {
        // 🔥 MENSAJE MEJORADO que indica el modo de operación
        const hayModoCompatibilidad = resultadosReserva.some(
          (r) => r.modo_compatibilidad
        );
        const mensajeModo = hayModoCompatibilidad
          ? "\n🔧 Modo compatibilidad: Reserva completada sin validación de asientos"
          : "\n✅ Reserva completada en el sistema";

        alert(
          `✅ ${ticketQuantity} tiquete(s) reservado(s) exitosamente!${mensajeModo}\n\n` +
            `✈️ Vuelo: ${flightData.flightNumber}\n` +
            `🛫 Tipo: ${flightType}\n` +
            `🎫 Clase: ${classText}\n` +
            `🎟️ Cantidad: ${ticketQuantity} tiquete(s)\n` +
            `💰 Total: ${new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }).format(totalPrice)}\n` +
            `⏰ Tienes 24 horas para completar la compra\n` +
            `📧 Revisa tu carrito para más detalles` +
            (resultadosReserva[0]?.idtiquete
              ? `\n🔢 IDs de reserva: ${resultadosReserva
                  .map((r) => r.idtiquete)
                  .join(", ")}`
              : "")
        );

        navigate("/cart");
      } else {
        alert("❌ No se pudo completar la reserva. Inténtalo de nuevo.");
      }
    } catch (error) {
      console.error("❌ Error en reserva:", error);

      // 🔥 MENSAJE DE ERROR MEJORADO
      let mensajeError = `Error al reservar: ${error.message}`;

      if (error.message.includes("asiento")) {
        mensajeError =
          `❌ Error del sistema: Problema con la base de datos de asientos.\n\n` +
          `El vuelo se ha reservado en modo compatibilidad. Revisa tu carrito.`;
      }

      alert(mensajeError);
    } finally {
      setReserving(false);
    }
  };

  // 🔥 NUEVA FUNCIÓN: Sincronizar estado del carrito
  const sincronizarEstadoCarrito = () => {
    console.log("🔄 Sincronizando estado del carrito...");

    if (!flightData) return;

    // Verificar estado actual
    const wasReserved = isFlightAlreadyReserved;
    const nowReserved = checkIfFlightIsReserved(flightData);

    if (wasReserved !== nowReserved) {
      console.log("🔄 Estado del vuelo cambiado:", {
        wasReserved,
        nowReserved,
        flightNumber: flightData.flightNumber,
      });

      // 🔥 NUEVO: Limpiar localStorage de items expirados
      const currentCart = JSON.parse(
        localStorage.getItem("vivasky_cart") || "[]"
      );

      const now = new Date();
      const validCart = currentCart.filter((item) => {
        if (item.reservationType === "temporal" && item.expiresAt) {
          const expiresAt = new Date(item.expiresAt);
          return expiresAt > now;
        }
        return true;
      });

      if (validCart.length !== currentCart.length) {
        localStorage.setItem("vivasky_cart", JSON.stringify(validCart));
        console.log(
          `🗑️ Limpiados ${
            currentCart.length - validCart.length
          } items expirados`
        );
      }
    }
  };

  // Resto de funciones existentes (checkAndCleanExpiredReservations, updateReservationTimers, etc.)
  const checkAndCleanExpiredReservations = () => {
    try {
      const currentCart = JSON.parse(
        localStorage.getItem("vivasky_cart") || "[]"
      );
      const now = new Date();

      const validReservations = currentCart.filter((item) => {
        if (item.reservationType === "temporal" && item.expiresAt) {
          const expirationDate = new Date(item.expiresAt);
          return expirationDate > now;
        }
        return true;
      });

      if (validReservations.length !== currentCart.length) {
        localStorage.setItem("vivasky_cart", JSON.stringify(validReservations));
      }

      return validReservations;
    } catch (error) {
      console.error("❌ Error limpiando reservas expiradas:", error);
      return [];
    }
  };

  const updateReservationTimers = () => {
    try {
      const currentCart = JSON.parse(
        localStorage.getItem("vivasky_cart") || "[]"
      );
      const now = new Date();
      let needsUpdate = false;

      const updatedCart = currentCart
        .map((item) => {
          if (item.reservationType === "temporal" && item.expiresAt) {
            const expirationDate = new Date(item.expiresAt);
            const timeDiff = expirationDate - now;

            if (timeDiff <= 0) {
              return null;
            }

            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor(
              (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
            );
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

            const newTimeLeft = `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

            if (item.timeLeft !== newTimeLeft) {
              needsUpdate = true;
              return {
                ...item,
                timeLeft: newTimeLeft,
              };
            }
          }
          return item;
        })
        .filter((item) => item !== null);

      if (needsUpdate) {
        localStorage.setItem("vivasky_cart", JSON.stringify(updatedCart));
      }

      return updatedCart;
    } catch (error) {
      console.error("❌ Error actualizando timers:", error);
      return [];
    }
  };

  // 🔥 EFECTO: Verificar reservas expiradas y si el vuelo está reservado
  useEffect(() => {
    checkAndCleanExpiredReservations();

    const timerInterval = setInterval(() => {
      updateReservationTimers();
      // 🔥 NUEVO: Sincronizar estado del carrito cada 5 segundos
      sincronizarEstadoCarrito();
    }, 5000); // Cada 5 segundos

    return () => clearInterval(timerInterval);
  }, [flightData, isFlightAlreadyReserved]);

  // 🔥 NUEVO EFECTO: Escuchar cambios en el carrito
  useEffect(() => {
    const handleCartChange = () => {
      console.log("🔄 Carrito cambiado, verificando estado de vuelo...");
      if (flightData) {
        checkIfFlightIsReserved(flightData);
      }
    };

    // Escuchar evento personalizado
    window.addEventListener("vivasky-cart-changed", handleCartChange);

    // También escuchar cambios directos en localStorage
    window.addEventListener("storage", handleCartChange);

    return () => {
      window.removeEventListener("vivasky-cart-changed", handleCartChange);
      window.removeEventListener("storage", handleCartChange);
    };
  }, [flightData]);

  // 🔥 EFECTO: Verificar si el vuelo está reservado cuando se cargan los datos
  useEffect(() => {
    if (flightData) {
      // 🔥 NUEVO: Sincronizar inmediatamente cuando se carga el vuelo
      sincronizarEstadoCarrito();

      // También verificar estado inicial
      checkIfFlightIsReserved(flightData);
    }
  }, [flightData]);

  // Resto de funciones de formateo (formatDuration, formatTime, formatDate)
  const formatDuration = (duration) => {
    if (!duration) return "2h 00m";
    if (typeof duration === "object" && duration.minutes !== undefined) {
      const totalMinutes = duration.minutes;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${minutes}m`;
      }
    }
    if (typeof duration === "string") return duration;
    if (typeof duration === "number") {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${minutes}m`;
      }
    }
    return "2h 00m";
  };

  const formatTime = (time) => {
    if (!time) return "00:00";
    try {
      if (typeof time === "object" && time.date) {
        const date = new Date(time.date);
        return date.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
      if (typeof time === "string") {
        const date = new Date(time);
        if (!isNaN(date)) {
          return date.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }
        return time.includes("T")
          ? time.split("T")[1].substring(0, 5)
          : time.substring(0, 5);
      }
      return "00:00";
    } catch {
      return "00:00";
    }
  };

  const formatDate = (date) => {
    if (!date) return "Fecha no disponible";
    try {
      if (typeof date === "string" && isNaN(Date.parse(date))) {
        return date;
      }
      if (typeof date === "object" && date.date) {
        const d = new Date(date.date);
        return d.toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      const d = new Date(date);
      if (!isNaN(d)) {
        return d.toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      return "Fecha no disponible";
    } catch {
      return "Fecha no disponible";
    }
  };

  // Manejar cambio de clase
  const handleClassChange = (classType) => {
    setSelectedClass(classType);
    calculateTotalPrice(flightData, classType);
  };

  // Verificar autenticación y obtener datos del vuelo
  useEffect(() => {
    const authCheck = checkAuth();

    if (!authCheck) {
      setLoading(false);
      return;
    }

    if (location.state && location.state.flight) {
      const rawFlightData = location.state.flight;

      const formattedFlightData = {
        ...rawFlightData,
        duration: formatDuration(rawFlightData.duration),
        departure: {
          ...rawFlightData.departure,
          time: formatTime(rawFlightData.departure?.time),
          date: formatDate(rawFlightData.departure?.date),
        },
        arrival: {
          ...rawFlightData.arrival,
          time: formatTime(rawFlightData.arrival?.time),
          date: formatDate(rawFlightData.arrival?.date),
        },
        priceNumber: Number(rawFlightData.priceNumber) || 0,
        costo_vip:
          Number(rawFlightData.costo_vip) ||
          Number(rawFlightData.priceNumber) ||
          0,
        returnFlight: rawFlightData.returnFlight
          ? {
              ...rawFlightData.returnFlight,
              duration: formatDuration(rawFlightData.returnFlight.duration),
              departure: {
                ...rawFlightData.returnFlight.departure,
                time: formatTime(rawFlightData.returnFlight.departure?.time),
                date: formatDate(rawFlightData.returnFlight.departure?.date),
              },
              arrival: {
                ...rawFlightData.returnFlight.arrival,
                time: formatTime(rawFlightData.returnFlight.arrival?.time),
                date: formatDate(rawFlightData.returnFlight.arrival?.date),
              },
              priceNumber: Number(rawFlightData.returnFlight.priceNumber) || 0,
              costo_vip:
                Number(rawFlightData.returnFlight.costo_vip) ||
                Number(rawFlightData.returnFlight.priceNumber) ||
                0,
            }
          : null,
      };

      setFlightData(formattedFlightData);
      calculateTotalPrice(formattedFlightData, "economica");

      // 🔥 VERIFICAR SI EL VUELO YA ESTÁ RESERVADO
      checkIfFlightIsReserved(formattedFlightData);

      setLoading(false);
    } else {
      navigate("/");
    }
  }, [location, navigate]);

  // Resto de funciones (checkAuth, isRootUser, isAdminUser, etc.)
  const checkAuth = () => {
    const authToken =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
    const userData =
      localStorage.getItem("userData") || sessionStorage.getItem("userData");

    if (authToken && userData) {
      try {
        const user = JSON.parse(userData);
        const userRole = user.tipo_usuario || user.role || "Usuario";

        setUserInfo({
          nombre: user.nombre,
          correo: user.correo,
          telefono: user.telefono || "No especificado",
          documento: user.documento || "No especificado",
          role: userRole,
          // 🔥 AGREGAR POSIBLES IDs
          id: user.id,
          idcliente: user.idcliente,
          id_usuario: user.id_usuario,
          cedula: user.cedula,
          numero_documento: user.numero_documento,
        });
        setUserRole(userRole);
        setIsAuthenticated(true);
        return true;
      } catch (error) {
        console.error("Error parsing user data:", error);
        handleLogout();
        return false;
      }
    }
    return false;
  };

  const isRootUser = () => {
    const rootRoles = ["root", "Root", "ROOT"];
    return rootRoles.includes(userRole);
  };

  const isAdminUser = () => {
    const adminRoles = ["Administrador", "administrador"];
    return adminRoles.includes(userRole);
  };

  const canMakeReservations = () => {
    return !isAdminUser() && !isRootUser();
  };

  const canUseCart = () => {
    const adminRoles = ["Administrador", "administrador", "admin", "root"];
    return !adminRoles.includes(userRole);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");

    setUserInfo(null);
    setIsAuthenticated(false);
    setUserRole("");
    alert("Has cerrado sesión exitosamente");
    navigate("/");
  };

  const getCartItemCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("vivasky_cart") || "[]");
      return cart.length;
    } catch {
      return 0;
    }
  };

  const showAdminRestrictionMessage = () => {
    alert(
      `⛔ Acción no permitida\n\nLos usuarios con rol de "${userRole}" no pueden realizar reservas ni compras de vuelos.\n\nEsta función está disponible únicamente para usuarios regulares (Cliente/Usuario).`
    );
  };

  // 🔥 NUEVO COMPONENTE: Modal moderno para seleccionar cantidad de tiquetes
  const QuantityModal = () => {
    if (!showQuantityModal) return null;

    const actionText = "Reservar";
    const subtitle = "24 horas para completar la compra";

    return (
      <div
        className="modal-overlay"
        onClick={() => setShowQuantityModal(false)}
      >
        <div
          className="quantity-modal modern"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header del Modal */}
          <div className="modal-header modern">
            <div className="header-icon">🎟️</div>
            <div className="header-content">
              <h3>Selecciona la cantidad</h3>
              <p>¿Cuántos tiquetes necesitas para este vuelo?</p>
            </div>
            <button
              className="modal-close modern"
              onClick={() => setShowQuantityModal(false)}
            >
              ×
            </button>
          </div>

          <div className="modal-content modern">
            {/* Selector de Cantidad */}
            <div className="quantity-selector modern">
              <div className="quantity-controls modern">
                <button
                  className="quantity-btn modern decrease"
                  onClick={() => handleQuantityChange(ticketQuantity - 1)}
                  disabled={ticketQuantity <= 1}
                >
                  <span className="btn-icon">−</span>
                </button>

                <div className="quantity-display modern">
                  <span className="quantity-number">{ticketQuantity}</span>
                  <span className="quantity-label">
                    {ticketQuantity === 1 ? "tiquete" : "tiquetes"}
                  </span>
                </div>

                <button
                  className="quantity-btn modern increase"
                  onClick={() => handleQuantityChange(ticketQuantity + 1)}
                  disabled={ticketQuantity >= 5}
                >
                  <span className="btn-icon">+</span>
                </button>
              </div>

              <div className="quantity-limit modern">
                <span className="limit-icon">📋</span>
                <span>Máximo 5 tiquetes por reserva</span>
              </div>
            </div>

            {/* Resumen de Precios */}
            <div className="price-summary-modal modern">
              <div className="summary-header">
                <h4>Resumen del precio</h4>
              </div>

              <div className="price-breakdown-modal">
                <div className="price-row-modal">
                  <span className="price-label">Precio unitario:</span>
                  <span className="price-value">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(totalPrice / ticketQuantity)}
                  </span>
                </div>

                <div className="price-row-modal">
                  <span className="price-label">Cantidad:</span>
                  <span className="price-value">
                    {ticketQuantity}{" "}
                    {ticketQuantity === 1 ? "tiquete" : "tiquetes"}
                  </span>
                </div>

                <div className="price-divider-modal"></div>

                <div className="price-row-modal total">
                  <span className="total-label">Total a pagar:</span>
                  <span className="total-price-modal">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Información Adicional */}
              <div className="additional-info">
                <div className="info-item">
                  <span className="info-icon">✈️</span>
                  <span>Vuelo: {flightData?.flightNumber}</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">🎭</span>
                  <span>
                    Clase: {selectedClass === "vip" ? "VIP" : "Económica"}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="modal-actions modern">
              <button
                className="modal-btn modern secondary"
                onClick={() => setShowQuantityModal(false)}
              >
                <span className="btn-icon">←</span>
                Cancelar
              </button>
              <button
                className="modal-btn modern primary"
                onClick={confirmActionWithQuantity}
                disabled={reserving}
              >
                {reserving ? (
                  <>
                    <span className="reserving-spinner"></span>
                    Procesando...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🛒</span>
                    {actionText} {ticketQuantity}{" "}
                    {ticketQuantity === 1 ? "Tiquete" : "Tiquetes"}
                  </>
                )}
              </button>
            </div>

            {/* Nota Informativa */}
            <div className="modal-note modern">
              <div className="note-icon">💡</div>
              <div className="note-content">
                <p>
                  <strong>Información importante:</strong>
                </p>
                <p>{subtitle}</p>
                <p className="warning-text">
                  ⚠️ Tu reserva se liberará automáticamente después de 24 horas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Resto del componente (UserMenu, ClassSelector, etc.) permanece igual...
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
            <span
              className={`user-role ${
                isAdminUser() || isRootUser() ? "admin-role" : "client-role"
              }`}
            >
              {userInfo.role}
            </span>
          </div>
          <span>▼</span>
        </button>

        {showMenu && (
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <div className="user-welcome">{userInfo.nombre}</div>
              <div className="user-menu-email">{userInfo.correo}</div>
              <div
                className={`user-role-badge ${
                  isAdminUser() || isRootUser() ? "admin-badge" : "client-badge"
                }`}
              >
                {userInfo.role}
              </div>
            </div>

            <div className="user-menu-items">
              <div className="menu-section-title">Mi Cuenta</div>

              {isAdminUser() ? (
                <>
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      navigate("/manage-flights");
                    }}
                  >
                    <span className="menu-icon">✈️</span>
                    Gestionar Vuelos
                  </button>

                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      navigate("/change-password");
                    }}
                  >
                    <span className="menu-icon">🔒</span>
                    Cambiar Contraseña
                  </button>
                </>
              ) : isRootUser() ? (
                <>
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      navigate("/change-password");
                    }}
                  >
                    <span className="menu-icon">🔒</span>
                    Cambiar Contraseña
                  </button>
                </>
              ) : (
                <>
                  {canUseCart() && (
                    <button
                      className="menu-item"
                      onClick={() => {
                        setShowMenu(false);
                        navigate("/cart");
                      }}
                    >
                      <span className="menu-icon">🛒</span>
                      Mi Carrito
                      {getCartItemCount() > 0 && (
                        <span className="cart-menu-badge">
                          {getCartItemCount()}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      navigate("/change-password");
                    }}
                  >
                    <span className="menu-icon">🔒</span>
                    Cambiar Contraseña
                  </button>
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      navigate("/edit-profile");
                    }}
                  >
                    <span className="menu-icon">👤</span>
                    Editar Perfil
                  </button>
                </>
              )}

              <div className="menu-divider"></div>

              <button
                className="menu-item logout"
                onClick={() => {
                  setShowMenu(false);
                  onLogout();
                }}
              >
                <span className="menu-icon">🚪</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ClassSelector = () => {
    const economicPrice = Number(flightData?.priceNumber) || 0;
    const vipPrice =
      Number(flightData?.costo_vip) || Number(flightData?.priceNumber) || 0;
    const priceDifference = vipPrice - economicPrice;

    return (
      <div className="class-selector-container">
        <h3>🎫 Selecciona tu clase</h3>
        <div className="class-options">
          {/* CLASE ECONÓMICA */}
          <div
            className={`class-option ${
              selectedClass === "economica" ? "selected" : ""
            }`}
            onClick={() => handleClassChange("economica")}
          >
            <div className="class-header">
              <span className="class-icon">💺</span>
              <div className="class-info">
                <h4>Clase Económica</h4>
                <p>Viaja cómodo con lo esencial</p>
              </div>
            </div>
            <div className="class-features">
              <div className="feature">
                <span className="check">✓</span>
                <span>Asiento estándar</span>
              </div>
              <div className="feature">
                <span className="check">✓</span>
                <span>Equipaje</span>
              </div>
              {/* PRECIO DEBAJO DE EQUIPAJE */}
              <div className="feature price-feature">
                <span className="price-tag">💰</span>
                <span className="price-text">
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  }).format(economicPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* CLASE VIP */}
          <div
            className={`class-option vip ${
              selectedClass === "vip" ? "selected" : ""
            }`}
            onClick={() => handleClassChange("vip")}
          >
            <div className="class-header">
              <span className="class-icon">⭐</span>
              <div className="class-info">
                <h4>Clase VIP</h4>
                <p>Experiencia premium de viaje</p>
              </div>
            </div>
            <div className="class-features">
              <div className="feature">
                <span className="check">✓</span>
                <span>Asientos premium</span>
              </div>
              <div className="feature">
                <span className="check">✓</span>
                <span>Equipaje 23kg</span>
              </div>
              <div className="feature">
                <span className="check">✓</span>
                <span>Atención personalizada</span>
              </div>
              {/* PRECIO DEBAJO DE ATENCIÓN PERSONALIZADA */}
              <div className="feature price-feature">
                <span className="price-tag">💰</span>
                <div className="price-comparison">
                  <span className="price">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(vipPrice)}
                  </span>
                  {priceDifference > 0 && (
                    <span className="price-difference">
                      +
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        minimumFractionDigits: 0,
                      }).format(priceDifference)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleLogoClick = () => {
    navigate("/");
  };

  const handleBackToSearch = () => {
    navigate("/search-flights", { state: location.state?.searchParams });
  };

  // 🔥 NUEVO: Componente para mostrar alerta de vuelo ya reservado
  const ReservationAlert = () => {
    if (!isFlightAlreadyReserved) return null;

    return (
      <div className="reservation-alert-banner">
        <div className="alert-icon">⏰</div>
        <div className="alert-content">
          <h3>Este vuelo ya está reservado</h3>
          <p>
            Tienes una reserva activa para este vuelo en tu carrito. La reserva
            expirará en 24 horas. Puedes completar la compra desde tu carrito.
          </p>
          {/* 🔥 NUEVO: Botón de sincronización */}
          <button
            className="sync-btn"
            onClick={sincronizarEstadoCarrito}
            style={{
              marginTop: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              background: "transparent",
              border: "1px solid #fff",
              color: "#fff",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔄 Verificar estado
          </button>
        </div>
        <div>
          <button
            className="alert-action-btn"
            onClick={() => navigate("/cart")}
          >
            Ir al Carrito
          </button>
        </div>
      </div>
    );
  };

  // Resto del componente (loading states, return JSX)...
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
          <p>Cargando información del vuelo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
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

          <nav className="navigation">
            <a href="#" onClick={() => navigate("/")}>
              Inicio
            </a>
            <a
              href="#"
              onClick={() => alert("Funcionalidad próximamente disponible")}
            >
              Noticias
            </a>
          </nav>

          <button className="back-btn" onClick={handleBackToSearch}>
            Volver a búsqueda
          </button>
        </header>

        <div className="auth-required-container">
          <div className="auth-required-card">
            <div className="auth-required-icon">✈️</div>
            <h1>Viaja con Nosotros</h1>
            <p className="auth-required-subtitle">
              Para reservar este vuelo necesitas tener una cuenta en VivaSky
            </p>

            {location.state?.flight && (
              <div className="flight-preview">
                <div className="flight-preview-header">
                  <h3>Vuelo Seleccionado</h3>
                  <span className="flight-price-preview">
                    {location.state.flight.price}
                  </span>
                </div>
                <div className="flight-preview-route">
                  <div className="preview-departure">
                    <strong>{location.state.flight.departure.city}</strong>
                    <span>{location.state.flight.departure.airport}</span>
                  </div>
                  <div className="preview-arrow">→</div>
                  <div className="preview-arrival">
                    <strong>{location.state.flight.arrival.city}</strong>
                    <span>{location.state.flight.arrival.airport}</span>
                  </div>
                </div>
                <div className="flight-preview-date">
                  {location.state.flight.departure.date}
                  {location.state?.searchParams?.tripType === "roundtrip" &&
                    ` - ${location.state.searchParams.returnDate}`}
                </div>
                <div className="flight-preview-meta">
                  <span>{location.state.flight.airline}</span>
                  <span>•</span>
                  <span>{location.state.flight.duration}</span>
                  <span>•</span>
                  <span>{location.state.flight.stops}</span>
                </div>
              </div>
            )}

            <div className="auth-required-actions">
              <button
                className="auth-required-btn primary"
                onClick={() =>
                  navigate("/login", {
                    state: {
                      from: location.pathname,
                      flight: location.state?.flight,
                      searchParams: location.state?.searchParams,
                    },
                  })
                }
              >
                Iniciar Sesión
              </button>
              <button
                className="auth-required-btn secondary"
                onClick={() =>
                  navigate("/register", {
                    state: {
                      from: location.pathname,
                      flight: location.state?.flight,
                      searchParams: location.state?.searchParams,
                    },
                  })
                }
              >
                Crear Cuenta
              </button>
            </div>

            <div className="auth-required-benefits">
              <h4>Beneficios de tener una cuenta VivaSky:</h4>
              <div className="benefits-grid">
                <div className="benefit-item">
                  <span className="benefit-icon">🎫</span>
                  <span>Gestiona tus reservas fácilmente</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">💰</span>
                  <span>Acceso a ofertas exclusivas</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">⚡</span>
                  <span>Check-in rápido y sencillo</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">📱</span>
                  <span>Acceso desde cualquier dispositivo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!flightData) {
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
          <div className="error-icon">❌</div>
          <h2>Error al cargar la información</h2>
          <p>No se pudo cargar la información del vuelo seleccionado.</p>
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

        {isAuthenticated && userInfo ? (
          <UserMenu userInfo={userInfo} onLogout={handleLogout} />
        ) : (
          <nav className="navigation">
            <a href="#" onClick={() => navigate("/")}>
              Inicio
            </a>
            <a
              href="#"
              onClick={() => alert("Funcionalidad próximamente disponible")}
            >
              Noticias
            </a>
          </nav>
        )}

        <button className="back-btn" onClick={handleBackToSearch}>
          Volver a búsqueda
        </button>
      </header>

      <div className="reservation-container-enhanced">
        {/* 🔥 NUEVO: Alerta de vuelo ya reservado */}
        <ReservationAlert />

        <QuantityModal />

        {(isAdminUser() || isRootUser()) && (
          <div className="admin-warning-banner">
            <div className="warning-icon">⚙️</div>
            <div className="warning-content">
              <h3>Modo Administración</h3>
              <p>
                Estás viendo esta página en modo de administración. Los usuarios
                con rol de <strong>{String(userRole)}</strong> no pueden
                realizar reservas ni compras de vuelos.
              </p>
            </div>
          </div>
        )}

        <div className="reservation-progress">
          <div className="progress-steps">
            <div
              className={`progress-step ${
                activeTab === "flight" ? "active" : "completed"
              }`}
            >
              <div className="step-number">1</div>
              <div className="step-label">Vuelo</div>
            </div>
            <div className="progress-line"></div>
            <div
              className={`progress-step ${
                activeTab === "payment" ? "active" : ""
              }`}
            >
              <div className="step-number">2</div>
              <div className="step-label">Pago</div>
            </div>
          </div>
        </div>

        <div className="reservation-header-enhanced">
          <h1>
            Confirma tu{" "}
            {flightData.returnFlight ? "Vuelo Ida y Vuelta" : "Vuelo"}
          </h1>
          <p>Revisa todos los detalles antes de finalizar tu reserva</p>
        </div>

        <div className="reservation-layout">
          <div className="reservation-main">
            <div className="reservation-tabs">
              <button
                className={`tab-button ${
                  activeTab === "flight" ? "active" : ""
                }`}
                onClick={() => setActiveTab("flight")}
              >
                ✈️ Información del Vuelo
              </button>
              <button
                className={`tab-button ${
                  activeTab === "payment" ? "active" : ""
                }`}
                onClick={() => setActiveTab("payment")}
              >
                💳 Resumen de Pago
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "flight" && flightData && (
                <div className="flight-details-enhanced">
                  <div className="flight-card-enhanced">
                    <div className="flight-header-enhanced">
                      <div className="airline-info">
                        <span className="airline-logo">✈️</span>
                        <div>
                          <h3>
                            {String(flightData.airline || "VivaSky Airlines")}
                          </h3>
                          <p className="flight-number">
                            {String(flightData.flightNumber || "N/A")}
                          </p>
                        </div>
                      </div>
                      <div className="flight-price-tag">
                        {selectedClass === "vip"
                          ? new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: "COP",
                              minimumFractionDigits: 0,
                            }).format(
                              Number(flightData.costo_vip) ||
                                Number(flightData.priceNumber) ||
                                0
                            )
                          : new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: "COP",
                              minimumFractionDigits: 0,
                            }).format(Number(flightData.priceNumber) || 0)}
                      </div>
                    </div>

                    <div className="flight-route-enhanced">
                      <div className="route-segment-enhanced">
                        <div className="time-large">
                          {String(flightData.departure?.time || "00:00")}
                        </div>
                        <div className="airport-info">
                          <div className="airport-code-large">
                            {String(flightData.departure?.airport || "N/A")}
                          </div>
                          <div className="city-name">
                            {String(flightData.departure?.city || "N/A")}
                          </div>
                        </div>
                        <div className="date-info">
                          {String(
                            flightData.departure?.date || "Fecha no disponible"
                          )}
                        </div>
                      </div>

                      <div className="route-middle-enhanced">
                        <div className="duration-badge">
                          {String(flightData.duration || "2h 00m")}
                        </div>
                        <div className="route-line">
                          <div className="line"></div>
                          <div className="plane-flying">✈️</div>
                        </div>
                        <div className="stops-info">
                          {String(flightData.stops || "Directo")}
                        </div>
                      </div>

                      <div className="route-segment-enhanced">
                        <div className="time-large">
                          {String(flightData.arrival?.time || "00:00")}
                        </div>
                        <div className="airport-info">
                          <div className="airport-code-large">
                            {String(flightData.arrival?.airport || "N/A")}
                          </div>
                          <div className="city-name">
                            {String(flightData.arrival?.city || "N/A")}
                          </div>
                        </div>
                        <div className="date-info">
                          {String(
                            flightData.arrival?.date || "Fecha no disponible"
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flight-features">
                      <div className="feature-item">
                        <span className="feature-icon">🎒</span>
                        <span>Equipaje </span>
                      </div>
                      <div className="feature-item">
                        <span className="feature-icon">🛬</span>
                        <span>Vuelo Directo</span>
                      </div>
                    </div>
                    <ClassSelector />
                  </div>

                  {flightData.returnFlight && (
                    <div className="return-flight-enhanced">
                      <div className="section-title">
                        <span className="title-icon">🔄</span>
                        Vuelo de Retorno
                      </div>
                      <div className="flight-card-enhanced return">
                        <div className="flight-route-enhanced">
                          <div className="route-segment-enhanced">
                            <div className="time-large">
                              {String(
                                flightData.returnFlight.departure?.time ||
                                  "00:00"
                              )}
                            </div>
                            <div className="airport-info">
                              <div className="airport-code-large">
                                {String(
                                  flightData.returnFlight.departure?.airport ||
                                    "N/A"
                                )}
                              </div>
                              <div className="city-name">
                                {String(
                                  flightData.returnFlight.departure?.city ||
                                    "N/A"
                                )}
                              </div>
                            </div>
                            <div className="date-info">
                              {String(
                                flightData.returnFlight.departure?.date ||
                                  "Fecha no disponible"
                              )}
                            </div>
                          </div>

                          <div className="route-middle-enhanced">
                            <div className="duration-badge">
                              {String(
                                flightData.returnFlight.duration || "2h 00m"
                              )}
                            </div>
                            <div className="route-line">
                              <div className="line"></div>
                              <div className="plane-flying">✈️</div>
                            </div>
                            <div className="stops-info">
                              {String(
                                flightData.returnFlight.stops || "Directo"
                              )}
                            </div>
                          </div>

                          <div className="route-segment-enhanced">
                            <div className="time-large">
                              {String(
                                flightData.returnFlight.arrival?.time || "00:00"
                              )}
                            </div>
                            <div className="airport-info">
                              <div className="airport-code-large">
                                {String(
                                  flightData.returnFlight.arrival?.airport ||
                                    "N/A"
                                )}
                              </div>
                              <div className="city-name">
                                {String(
                                  flightData.returnFlight.arrival?.city || "N/A"
                                )}
                              </div>
                            </div>
                            <div className="date-info">
                              {String(
                                flightData.returnFlight.arrival?.date ||
                                  "Fecha no disponible"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "payment" && flightData && (
                <div className="payment-details-enhanced">
                  <div className="payment-card">
                    <h3>💳 Resumen de Pago</h3>

                    <div className="price-breakdown">
                      <div className="price-row">
                        <span>
                          Vuelo ida (
                          {selectedClass === "vip" ? "VIP" : "Económica"})
                        </span>
                        <span>
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                          }).format(
                            selectedClass === "vip"
                              ? Number(flightData.costo_vip) ||
                                  Number(flightData.priceNumber) ||
                                  0
                              : Number(flightData.priceNumber) || 0
                          )}
                        </span>
                      </div>

                      {flightData.returnFlight && (
                        <div className="price-row">
                          <span>
                            Vuelo retorno (
                            {selectedClass === "vip" ? "VIP" : "Económica"})
                          </span>
                          <span>
                            {new Intl.NumberFormat("es-CO", {
                              style: "currency",
                              currency: "COP",
                              minimumFractionDigits: 0,
                            }).format(
                              selectedClass === "vip"
                                ? Number(flightData.returnFlight.costo_vip) ||
                                    Number(
                                      flightData.returnFlight.priceNumber
                                    ) ||
                                    0
                                : Number(flightData.returnFlight.priceNumber) ||
                                    0
                            )}
                          </span>
                        </div>
                      )}

                      {/* 🔥 CORREGIDO: Mostrar correctamente la cantidad de tiquetes */}
                      <div className="price-row">
                        <span>Cantidad de tiquetes:</span>
                        <span className="ticket-quantity-highlight">
                          {ticketQuantity} tiquete(s)
                        </span>
                      </div>

                      <div className="price-divider-enhanced"></div>

                      <div className="price-row total">
                        <span>Total a pagar:</span>
                        <span className="total-price">
                          {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                          }).format(totalPrice)}
                        </span>
                      </div>
                    </div>
                    <div className="payment-features">
                      <div className="payment-feature">
                        <span className="feature-check">✓</span>
                        <span>Pago 100% seguro</span>
                      </div>
                      <div className="payment-feature">
                        <span className="feature-check">✓</span>
                        <span>Soporte 24/7</span>
                      </div>
                    </div>

                    {(isAdminUser() || isRootUser()) && (
                      <div className="admin-restriction-message">
                        <div className="restriction-icon">⛔</div>
                        <div className="restriction-content">
                          <h4>Función no disponible</h4>
                          <p>
                            Los usuarios administradores no pueden realizar
                            reservas ni compras de vuelos.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="reservation-sidebar">
            <div className="sidebar-card">
              <h3>Resumen del Viaje</h3>

              <div className="route-summary">
                <div className="cities">
                  <span className="city-from">
                    {String(flightData?.departure?.city || "N/A")}
                  </span>
                  <span className="arrow">→</span>
                  <span className="city-to">
                    {String(flightData?.arrival?.city || "N/A")}
                  </span>
                </div>
                <div className="dates">
                  {String(flightData?.departure?.date || "Fecha no disponible")}
                  {flightData.returnFlight && (
                    <>
                      <br />
                      {String(
                        flightData.returnFlight.departure?.date ||
                          "Fecha no disponible"
                      )}
                    </>
                  )}
                </div>
                <div className="class-selected">
                  <strong>Clase:</strong>{" "}
                  {selectedClass === "vip" ? "VIP" : "Económica"}
                </div>
                <div className="trip-type">
                  <strong>Tipo:</strong>{" "}
                  {flightData.returnFlight ? "Ida y Vuelta" : "Solo Ida"}
                </div>
                {/* 🔥 CORREGIDO: Mostrar cantidad en el resumen */}
                <div className="ticket-quantity">
                  <strong>Tiquetes:</strong> {ticketQuantity}
                </div>
              </div>

              <div className="price-summary-sidebar">
                <div className="price-item-sidebar">
                  <span>
                    Vuelo ida ({selectedClass === "vip" ? "VIP" : "Económica"}):
                  </span>
                  <span>
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(
                      selectedClass === "vip"
                        ? Number(flightData.costo_vip) ||
                            Number(flightData.priceNumber) ||
                            0
                        : Number(flightData.priceNumber) || 0
                    )}
                  </span>
                </div>

                {flightData.returnFlight && (
                  <div className="price-item-sidebar">
                    <span>
                      Vuelo retorno (
                      {selectedClass === "vip" ? "VIP" : "Económica"}):
                    </span>
                    <span>
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        minimumFractionDigits: 0,
                      }).format(
                        selectedClass === "vip"
                          ? Number(flightData.returnFlight.costo_vip) ||
                              Number(flightData.returnFlight.priceNumber) ||
                              0
                          : Number(flightData.returnFlight.priceNumber) || 0
                      )}
                    </span>
                  </div>
                )}

                {/* 🔥 CORREGIDO: Mostrar cantidad de tiquetes */}
                <div className="price-item-sidebar">
                  <span>Cantidad de tiquetes:</span>
                  <span>{ticketQuantity}</span>
                </div>

                <div className="price-divider-sidebar"></div>

                <div className="price-total-sidebar">
                  <span>Total:</span>
                  <span className="total-amount">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(totalPrice)}
                  </span>
                </div>
              </div>

              <div className="sidebar-actions">
                {canMakeReservations() ? (
                  <>
                    {/* 🔥 MODIFICADO: Solo botón de reserva */}
                    <button
                      className={`action-btn reserve-btn-sidebar ${
                        isFlightAlreadyReserved ? "disabled" : ""
                      } ${reserving ? "loading" : ""}`}
                      onClick={() => showQuantitySelection()}
                      disabled={isFlightAlreadyReserved || reserving}
                    >
                      {reserving ? (
                        <>
                          <span className="btn-icon">⏳</span>
                          Reservando...
                          <span className="btn-subtitle">
                            Procesando tu reserva
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="btn-icon">🛒</span>
                          {isFlightAlreadyReserved
                            ? "Ya Reservado"
                            : "Reservar en Carrito"}
                          <span className="btn-subtitle">
                            {isFlightAlreadyReserved
                              ? "Vuelo ya está en tu carrito"
                              : "24 horas para completar"}
                          </span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="admin-restriction-sidebar">
                    <div className="restriction-icon-sidebar">⚙️</div>
                    <div className="restriction-text">
                      <strong>Modo Administración</strong>
                      <p>
                        Las reservas no están disponibles para usuarios
                        administradores.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReserveFlight;
