import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./Cart.css";

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [tripType, setTripType] = useState("roundtrip");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔥 NUEVA FUNCIÓN: Obtener clase CSS según tiempo restante
  const getExpirationClass = (item) => {
    if (item.reservationType === "temporal" && item.timeLeft) {
      const [hours] = item.timeLeft.split(":").map(Number);

      if (hours < 1) return "expiring-soon"; // Menos de 1 hora
      if (hours < 6) return "expiring-warning"; // Menos de 6 horas
    }
    return "";
  };

  // 🔥 NUEVA FUNCIÓN: Limpiar reservas expiradas del backend
  const limpiarExpiradosDelBackend = async (
    todosItems,
    itemsValidos,
    idcliente
  ) => {
    try {
      const expirados = todosItems.filter(
        (item) =>
          !itemsValidos.some((valido) => valido.idtiquete === item.idtiquete)
      );

      if (expirados.length === 0) return;

      console.log(
        `🔄 Eliminando ${expirados.length} reservas expiradas del backend`
      );

      const promises = expirados.map(async (item) => {
        try {
          const response = await fetch(
            `http://localhost:5000/api/carrito/reserva/${item.idtiquete}`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (response.ok) {
            console.log(`✅ Tiquete expirado eliminado: ${item.idtiquete}`);
          }
        } catch (error) {
          console.error(
            `❌ Error eliminando tiquete expirado ${item.idtiquete}:`,
            error
          );
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error("❌ Error limpiando expirados del backend:", error);
    }
  };

  // 🔥 FUNCIÓN PARA OBTENER ID DEL CLIENTE
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
      (id) => id && id !== "No especificado"
    );

    if (!idEncontrado) {
      console.error("❌ No se pudo encontrar ID del cliente en:", userInfo);
      return null;
    }

    console.log("✅ ID del cliente encontrado:", idEncontrado);
    return idEncontrado;
  };

  // 🔥 FUNCIÓN MEJORADA: Obtener carrito del backend con filtrado de expirados
  const obtenerCarritoBackend = async (idcliente) => {
    try {
      console.log("🔄 Obteniendo carrito del backend para:", idcliente);
      const response = await fetch(
        `http://localhost:5000/api/carrito/${idcliente}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Carrito crudo del backend:", data.carrito);

        // 🔥 FILTRAR reservas expiradas automáticamente
        const carritoFiltrado = data.carrito || [];
        const now = new Date();

        const carritoValido = carritoFiltrado.filter((item) => {
          if (!item.horacreacion) return true;

          const fechaCreacion = new Date(item.horacreacion);
          const fechaExpiracion = new Date(
            fechaCreacion.getTime() + 24 * 60 * 60 * 1000
          );

          return fechaExpiracion > now;
        });

        // 🔥 Si se filtraron algunos, limpiar del backend
        if (carritoValido.length !== carritoFiltrado.length) {
          console.log(
            `🗑️ Se filtraron ${
              carritoFiltrado.length - carritoValido.length
            } reservas expiradas`
          );

          // Eliminar expirados del backend
          await limpiarExpiradosDelBackend(
            carritoFiltrado,
            carritoValido,
            idcliente
          );
        }

        return carritoValido;
      } else {
        console.warn("⚠️ No se pudo obtener carrito del backend");
        return [];
      }
    } catch (error) {
      console.error("❌ Error obteniendo carrito del backend:", error);
      return [];
    }
  };

  // 🔥 NUEVA FUNCIÓN: Formatear hora correctamente
  const formatTime = (timeString) => {
    if (!timeString) return "00:00";

    try {
      // Si ya está en formato HH:MM
      if (typeof timeString === "string" && timeString.includes(":")) {
        const [hours, minutes] = timeString.split(":");
        return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
      }

      // Si es un objeto de hora
      if (typeof timeString === "object" && timeString.hours !== undefined) {
        const hours = String(timeString.hours || 0).padStart(2, "0");
        const minutes = String(timeString.minutes || 0).padStart(2, "0");
        return `${hours}:${minutes}`;
      }

      return "00:00";
    } catch (error) {
      console.error("❌ Error formateando hora:", error, timeString);
      return "00:00";
    }
  };

  // 🔥 NUEVA FUNCIÓN: Formatear fecha correctamente
  const formatDate = (dateString) => {
    if (!dateString) return "Fecha no disponible";

    try {
      // Si ya es una fecha legible
      if (typeof dateString === "string" && dateString.includes("-")) {
        const date = new Date(dateString);
        if (!isNaN(date)) {
          return date.toLocaleDateString("es-CO", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      }

      // Si es un objeto Date o timestamp
      const date = new Date(dateString);
      if (!isNaN(date)) {
        return date.toLocaleDateString("es-CO", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }

      return "Fecha no disponible";
    } catch (error) {
      console.error("❌ Error formateando fecha:", error, dateString);
      return "Fecha no disponible";
    }
  };

  // 🔥 NUEVA FUNCIÓN: Calcular hora de llegada
  const calcularHoraLlegada = (horaSalida, duracion) => {
    try {
      const [salidaHours, salidaMinutes] = horaSalida.split(":").map(Number);

      let horasDuracion = 0;
      let minutosDuracion = 0;

      if (typeof duracion === "object") {
        horasDuracion = duracion.hours || 0;
        minutosDuracion = duracion.minutes || 0;
      } else if (typeof duracion === "string") {
        // Parsear "1h 30m" o "2h"
        const match = duracion.match(/(\d+)h\s*(\d+)m?/);
        if (match) {
          horasDuracion = parseInt(match[1]) || 0;
          minutosDuracion = parseInt(match[2]) || 0;
        }
      }

      let llegadaMinutes = salidaMinutes + minutosDuracion;
      let llegadaHours = salidaHours + horasDuracion;

      if (llegadaMinutes >= 60) {
        llegadaHours += Math.floor(llegadaMinutes / 60);
        llegadaMinutes = llegadaMinutes % 60;
      }

      if (llegadaHours >= 24) {
        llegadaHours = llegadaHours % 24;
      }

      return `${String(llegadaHours).padStart(2, "0")}:${String(
        llegadaMinutes
      ).padStart(2, "0")}`;
    } catch (error) {
      console.error("❌ Error calculando hora de llegada:", error);
      return "00:00";
    }
  };

  // 🔥 NUEVA FUNCIÓN: Eliminar automáticamente del backend cuando expira
  const eliminarExpiradoDelBackend = async (item) => {
    if (!item.backendData?.desdeBackend || !item.backendData.tiquetesIds)
      return;

    try {
      console.log(
        `🗑️ Eliminando grupo expirado del backend: ${item.backendData.conexion}`
      );

      const promises = item.backendData.tiquetesIds.map(async (idtiquete) => {
        try {
          await fetch(
            `http://localhost:5000/api/carrito/reserva/${idtiquete}`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          console.error(
            `❌ Error eliminando tiquete expirado ${idtiquete}:`,
            error
          );
        }
      });

      await Promise.all(promises);
      console.log(`✅ Grupo expirado eliminado del backend`);
    } catch (error) {
      console.error("❌ Error eliminando grupo expirado:", error);
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Formatear items del backend para frontend - CON AGRUPACIÓN Y FILTRADO DE EXpirados
  const formatearItemsAgrupados = async (carritoBackend) => {
    try {
      console.log("🔍 Agrupando items por conexión...");
      const now = new Date();

      // 🔥 FILTRAR expirados antes de agrupar
      const carritoValido = carritoBackend.filter((item) => {
        if (!item.horacreacion) return false;

        const fechaCreacion = new Date(item.horacreacion);
        const expiresAt = new Date(
          fechaCreacion.getTime() + 24 * 60 * 60 * 1000
        );

        return expiresAt > now;
      });

      if (carritoValido.length === 0) {
        console.log("📭 Carrito vacío después de filtrar expirados");
        return [];
      }

      console.log(`✅ ${carritoValido.length} items válidos (no expirados)`);

      // 🔥 AGRUPAR por conexión
      const gruposPorConexion = {};

      carritoValido.forEach((item) => {
        const conexion = item.conexion;
        if (!gruposPorConexion[conexion]) {
          gruposPorConexion[conexion] = [];
        }
        gruposPorConexion[conexion].push(item);
      });

      console.log(
        "📦 Grupos por conexión:",
        Object.keys(gruposPorConexion).length,
        gruposPorConexion
      );

      // 🔥 PROCESAR cada grupo como una sola reserva
      const itemsAgrupados = [];

      for (const [conexion, itemsGrupo] of Object.entries(gruposPorConexion)) {
        if (itemsGrupo.length > 0) {
          // Tomar el primer item como base (todos comparten misma info de vuelo)
          const itemBase = itemsGrupo[0];

          // 🔥 CALCULAR PRECIO TOTAL CORRECTO
          let precioTotal = 0;
          let precioUnitario = 0;

          // Determinar precio unitario basado en clase
          if (itemBase.clase === "vip") {
            precioUnitario = Number(itemBase.costo_vip) || 200000;
          } else {
            precioUnitario =
              Number(itemBase.costo_economico) ||
              Number(itemBase.precio) ||
              100000;
          }

          // 🔥 PRECIO TOTAL = Precio unitario × Cantidad de tiquetes
          precioTotal = precioUnitario * itemsGrupo.length;

          console.log(`💰 Precios para conexión ${conexion}:`, {
            cantidad: itemsGrupo.length,
            precioUnitario,
            precioTotal,
            clase: itemBase.clase,
            costo_vip: itemBase.costo_vip,
            costo_economico: itemBase.costo_economico,
          });

          // 🔥 FORMATEAR HORAS CORRECTAMENTE
          const horaSalidaFormateada = formatTime(itemBase.hora_salida);
          const horaLlegadaCalculada = calcularHoraLlegada(
            horaSalidaFormateada,
            itemBase.duracion
          );
          const fechaSalidaFormateada = formatDate(itemBase.fecha_salida);
          const fechaLlegadaFormateada = formatDate(itemBase.fecha_llegada);

          // Calcular expiración
          const horacreacion = new Date(itemBase.horacreacion);
          const expiresAt = new Date(
            horacreacion.getTime() + 24 * 60 * 60 * 1000
          );
          const timeDiff = expiresAt - now;

          // 🔥 SOLO INCLUIR SI NO ESTÁ EXpirado
          if (timeDiff <= 0) {
            console.log(
              `⏰ Grupo ${conexion} expirado, no se incluye en carrito`
            );
            continue; // Saltar este grupo
          }

          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor(
            (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
          );
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

          const timeLeft =
            timeDiff > 0
              ? `${hours.toString().padStart(2, "0")}:${minutes
                  .toString()
                  .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
              : "00:00:00";

          const itemAgrupado = {
            id: `grupo_${conexion}`,
            flightNumber: itemBase.id_vuelo
              ? `VS${itemBase.id_vuelo}`
              : "VS000",
            airline: "VivaSky Airlines",
            price: new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }).format(precioTotal),
            priceNumber: precioTotal,
            unitPrice: precioUnitario, // 🔥 NUEVO: Precio unitario
            selectedClass: itemBase.clase || "economica",
            classText: itemBase.clase === "vip" ? "VIP" : "Económica",
            duration: itemBase.duracion
              ? typeof itemBase.duracion === "object"
                ? `${itemBase.duracion.hours || 0}h ${String(
                    itemBase.duracion.minutes || 0
                  ).padStart(2, "0")}m`
                : itemBase.duracion
              : "2h 00m",
            stops: "Directo",
            departure: {
              city: itemBase.origen || "Ciudad Origen",
              airport: itemBase.origen
                ? itemBase.origen.substring(0, 3).toUpperCase()
                : "ORI",
              time: horaSalidaFormateada,
              date: fechaSalidaFormateada,
            },
            arrival: {
              city: itemBase.destino || "Ciudad Destino",
              airport: itemBase.destino
                ? itemBase.destino.substring(0, 3).toUpperCase()
                : "DES",
              time: horaLlegadaCalculada,
              date: fechaLlegadaFormateada,
            },
            reservationType: "temporal",
            reservedAt: horacreacion.toISOString(),
            expiresAt: expiresAt.toISOString(),
            timeLeft: timeLeft,
            status: timeDiff > 0 ? "reserved" : "expired", // 🔥 NUEVO: Estado
            isExpired: timeDiff <= 0, // 🔥 NUEVO: Flag de expiración

            // 🔥 CORREGIDO: Cantidad real de tiquetes reservados
            ticketQuantity: itemsGrupo.length,

            // 🔥 DATOS DEL BACKEND PARA EL GRUPO COMPLETO
            backendData: {
              conexion: conexion,
              itemsCount: itemsGrupo.length,
              tiquetesIds: itemsGrupo.map((item) => item.idtiquete),
              asientos: itemsGrupo.map(
                (item) => item.numeroasiento || item.idasiento
              ),
              desdeBackend: true,
            },
          };

          itemsAgrupados.push(itemAgrupado);
        }
      }

      console.log("✅ Items agrupados finales:", itemsAgrupados);
      return itemsAgrupados;
    } catch (error) {
      console.error("❌ Error agrupando items:", error);
      return [];
    }
  };

  // 🔥 FUNCIÓN CORREGIDA: Eliminar reserva del backend (TODO EL GRUPO)
  const eliminarReservaBackend = async (item) => {
    try {
      console.log(
        "🗑️ Eliminando grupo completo del backend:",
        item.backendData.conexion
      );
      console.log("📋 Tiquetes a eliminar:", item.backendData.tiquetesIds);

      // Eliminar todos los tiquetes del grupo usando la ruta correcta
      const promises = item.backendData.tiquetesIds.map(async (idtiquete) => {
        try {
          const response = await fetch(
            `http://localhost:5000/api/carrito/reserva/${idtiquete}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `❌ Error eliminando tiquete ${idtiquete}:`,
              errorText
            );
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const result = await response.json();
          console.log(`✅ Tiquete ${idtiquete} eliminado:`, result);
          return { success: true, idtiquete, result };
        } catch (error) {
          console.error(`❌ Error con tiquete ${idtiquete}:`, error);
          return { success: false, idtiquete, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      const successfulDeletes = results.filter((result) => result.success);
      const failedDeletes = results.filter((result) => !result.success);

      console.log("📊 Resultados de eliminación:", {
        total: results.length,
        success: successfulDeletes.length,
        failed: failedDeletes.length,
        failedDetails: failedDeletes,
      });

      if (failedDeletes.length === 0) {
        console.log("✅ Todos los tiquetes eliminados exitosamente");
        return true;
      } else {
        console.warn(
          "⚠️ Algunos tiquetes no se pudieron eliminar:",
          failedDeletes
        );
        // Retornamos true si al menos uno se eliminó
        return successfulDeletes.length > 0;
      }
    } catch (error) {
      console.error("❌ Error eliminando grupo del backend:", error);
      return false;
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Cargar carrito desde backend - CON AGRUPACIÓN Y FILTRADO
  const cargarCarritoDesdeBackend = async () => {
    setLoading(true);

    // Obtener información del usuario
    const userData =
      localStorage.getItem("userData") || sessionStorage.getItem("userData");
    if (userData) {
      const user = JSON.parse(userData);
      setUserInfo(user);

      // Obtener ID del cliente
      const idcliente = obtenerIdCliente(user);

      if (idcliente) {
        try {
          // Obtener carrito del BACKEND (con filtrado de expirados)
          const carritoBackend = await obtenerCarritoBackend(idcliente);
          console.log("📦 Carrito filtrado del backend:", carritoBackend);

          // 🔥 AGRUPAR items por conexión (ya filtrados)
          const itemsAgrupados = await formatearItemsAgrupados(carritoBackend);

          setCartItems(itemsAgrupados);
          console.log(
            "✅ Carrito cargado desde backend:",
            itemsAgrupados.length,
            "grupos únicos no expirados"
          );
          console.log("📋 Items finales agrupados:", itemsAgrupados);
        } catch (error) {
          console.error("❌ Error cargando carrito desde backend:", error);
          setCartItems([]);
        }
      } else {
        console.warn("⚠️ No se pudo obtener ID del cliente");
        setCartItems([]);
      }
    } else {
      console.warn("⚠️ Usuario no autenticado");
      setCartItems([]);
    }

    setLoading(false);
  };

  // 🔥 FUNCIÓN: Procesar compra directa
  const proceedToPurchase = (flight) => {
    const purchaseFlight = {
      ...flight,
      selectedClass: flight.selectedClass || "economica",
      ticketQuantity: flight.ticketQuantity || 1,
      priceNumber: Number(flight.priceNumber) || 0,
      costo_vip: Number(flight.costo_vip) || 0,
    };

    console.log("🛒 Redirigiendo a compra directa:", purchaseFlight);

    navigate("/purchase-flight", {
      state: {
        flight: purchaseFlight,
        fromCart: true,
        cartItemId: flight.id,
      },
    });
  };

  // 🔥 FUNCIÓN MEJORADA: Eliminar del carrito (ELIMINAR GRUPO COMPLETO)
  const removeFromCart = async (flightId) => {
    const item = cartItems.find((item) => item.id === flightId);

    if (!item) {
      console.error("❌ Item no encontrado en el carrito");
      return;
    }

    if (item?.backendData?.desdeBackend) {
      // Confirmar eliminación
      const confirmDelete = window.confirm(
        `¿Estás seguro de que quieres cancelar esta reserva?\n\n` +
          `Vuelo: ${item.departure.city} → ${item.arrival.city}\n` +
          `Tiquetes: ${item.ticketQuantity}\n` +
          `Total: ${item.price}`
      );

      if (!confirmDelete) return;

      // Mostrar loading específico para eliminación
      setLoading("deleting");

      try {
        // Eliminar TODO EL GRUPO del backend
        const success = await eliminarReservaBackend(item);

        if (success) {
          // Recargar el carrito completo desde backend
          await cargarCarritoDesdeBackend();
          console.log("✅ Grupo completo eliminado del carrito");

          // El loading se quitará automáticamente cuando cargue el nuevo carrito
        } else {
          alert("❌ No se pudo eliminar la reserva. Inténtalo de nuevo.");
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Error eliminando reserva:", error);
        alert("❌ Error al eliminar la reserva. Inténtalo de nuevo.");
        setLoading(false);
      }
    } else {
      console.warn("⚠️ Item no reconocido o sin datos del backend");
      alert("❌ No se puede eliminar este item. Datos incorrectos.");
    }
  };

  // 🔥 FUNCIONES AUSENTES AGREGADAS:
  const handleLogoClick = () => {
    navigate("/");
  };

  const handleContinueShopping = () => {
    navigate("/");
  };

  const getAvailableDestinations = (selectedOrigin) => {
    const colombianCities = [
      "Bogotá",
      "Medellín",
      "Cali",
      "Barranquilla",
      "Cartagena",
      "Cúcuta",
      "Bucaramanga",
      "Pereira",
      "Santa Marta",
      "Ibagué",
      "Pasto",
      "Manizales",
    ];

    const internationalCities = [
      "Madrid",
      "Londres",
      "New York",
      "Buenos Aires",
      "Miami",
    ];

    const internationalGateways = [
      "Pereira",
      "Bogotá",
      "Medellín",
      "Cali",
      "Cartagena",
    ];

    if (!selectedOrigin) return [...colombianCities, ...internationalCities];

    if (internationalCities.includes(selectedOrigin)) {
      return internationalGateways;
    }

    if (internationalGateways.includes(selectedOrigin)) {
      return [
        ...colombianCities.filter((city) => city !== selectedOrigin),
        ...internationalCities,
      ];
    }

    return colombianCities.filter((city) => city !== selectedOrigin);
  };

  const handleSearchFromModal = (e) => {
    e.preventDefault();

    if (!origin || !destination) {
      alert("Por favor selecciona una ciudad de origen y destino");
      return;
    }

    setShowSearchModal(false);

    navigate("/search-flights", {
      state: {
        origin,
        destination,
        departureDate: formatDisplayDate(departureDate),
        returnDate:
          tripType === "roundtrip" ? formatDisplayDate(returnDate) : null,
        tripType,
      },
    });
  };

  const getLocalDate = (date) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const options = { weekday: "short", day: "numeric", month: "short" };
    return date.toLocaleDateString("es-ES", options);
  };

  // 🔥 FUNCIÓN MEJORADA: Obtener texto de expiración
  const getExpirationText = (item) => {
    if (item.reservationType === "temporal") {
      if (item.timeLeft === "00:00:00" || item.isExpired) {
        return "⏰ EXPIRADO - Será eliminado";
      }
      return `Expira en: ${item.timeLeft}`;
    }
    return null;
  };

  // 🔥 EFECTO PRINCIPAL: Cargar carrito al montar el componente con limpieza automática
  useEffect(() => {
    cargarCarritoDesdeBackend();

    // Timer para actualizar tiempos de expiración Y ELIMINAR EXpirados automáticamente
    const timerInterval = setInterval(() => {
      setCartItems((prevItems) => {
        const now = new Date();
        const nuevosItems = [];
        const itemsAEliminar = [];

        prevItems.forEach((item) => {
          if (item.reservationType === "temporal" && item.expiresAt) {
            const expirationDate = new Date(item.expiresAt);
            const timeDiff = expirationDate - now;

            // 🔥 SI YA EXPIRO (tiempo <= 0)
            if (timeDiff <= 0) {
              console.log(`⏰ Vuelo expirado detectado: ${item.flightNumber}`);
              itemsAEliminar.push(item); // Guardar para eliminar del backend
              return; // No agregar a nuevosItems
            }

            // Calcular tiempo restante
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor(
              (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
            );
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

            const newTimeLeft = `${hours.toString().padStart(2, "0")}:${minutes
              .toString()
              .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

            nuevosItems.push({
              ...item,
              timeLeft: newTimeLeft,
              isExpired: false, // Actualizar estado
            });
          } else {
            nuevosItems.push(item);
          }
        });

        // 🔥 Eliminar del backend si hay expirados
        if (itemsAEliminar.length > 0) {
          console.log(
            `🗑️ Eliminando ${itemsAEliminar.length} vuelos expirados del backend`
          );
          itemsAEliminar.forEach((item) => {
            eliminarExpiradoDelBackend(item);
          });
        }

        return nuevosItems;
      });
    }, 1000); // Verificar cada segundo

    return () => clearInterval(timerInterval);
  }, []);

  // 🔥 Inicializar fechas
  useEffect(() => {
    const todayDate = getLocalDate(new Date());
    const nextWeek = getLocalDate(new Date());
    nextWeek.setDate(todayDate.getDate() + 7);

    setDepartureDate(formatDateForInput(todayDate));
    setReturnDate(formatDateForInput(nextWeek));
  }, []);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = Number(item.priceNumber) || 0;
      return total + price;
    }, 0);
  };

  const getTotalItems = () => {
    return cartItems.length;
  };

  // 🔥 FUNCIÓN: Obtener badge de estado
  const getStatusBadge = (item) => {
    if (item.reservationType === "temporal") {
      if (item.isExpired) {
        return <span className="status-badge expired">⏰ EXPIRADO</span>;
      }
      return <span className="status-badge reserved">⏰ Reservado</span>;
    }
    return null;
  };

  const today = formatDateForInput(getLocalDate(new Date()));

  // 🔥 Loading state - Actualizado para incluir eliminación
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
          <div className="cart-header-info">
            <span className="cart-welcome">
              {loading === "deleting"
                ? "Eliminando reserva..."
                : "Cargando carrito..."}
            </span>
          </div>
        </header>
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>
            {loading === "deleting"
              ? "Cancelando reserva..."
              : "Cargando tus reservas desde el sistema..."}
          </p>
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

        <div className="cart-header-info">
          <span className="cart-welcome">
            {userInfo ? `Hola, ${userInfo.nombre}` : "Mi Carrito"}
          </span>
        </div>
      </header>

      <div className="cart-container">
        <div className="cart-header">
          <h1>🛒 Mi Carrito de Reservas</h1>
          <p>Tus vuelos reservados en el sistema VivaSky</p>
          {cartItems.length > 0 && (
            <div className="cart-debug-info">
              <small>Mostrando {cartItems.length} reserva(s) activa(s)</small>
              <small className="expiration-note-small">
                ⚠️ Las reservas expiradas se eliminan automáticamente
              </small>
            </div>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>No tienes reservas activas</h2>
            <p>
              Tu carrito de reservas está vacío o todas las reservas han
              expirado
            </p>
            <button
              className="continue-shopping-btn"
              onClick={handleContinueShopping}
            >
              Explorar Vuelos
            </button>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-summary">
              <div className="cart-stats">
                <span className="cart-count">
                  {getTotalItems()}{" "}
                  {getTotalItems() === 1
                    ? "reserva activa"
                    : "reservas activas"}
                </span>
                <span className="cart-total">
                  Total:{" "}
                  {new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0,
                  }).format(calculateTotal())}
                </span>
              </div>
              <button
                className="continue-shopping-btn"
                onClick={handleContinueShopping}
              >
                Buscar Más Vuelos
              </button>
            </div>

            <div className="cart-items">
              {cartItems.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className={`cart-item ${getExpirationClass(item)}`}
                  data-reserved={item.reservationType === "temporal"}
                  data-backend={item.backendData?.desdeBackend}
                  data-expired={item.isExpired}
                >
                  <div className="cart-item-header">
                    <div className="flight-airline">
                      <span className="airline-logo">✈️</span>
                      <div>
                        <h3>{item.airline || "VivaSky Airlines"}</h3>
                        <span className="flight-number">
                          {item.flightNumber || "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="cart-item-price">{item.price}</div>
                  </div>

                  <div className="cart-item-meta">
                    <div className="item-type-badge">
                      {getStatusBadge(item)}
                      {/* 🔥 CORREGIDO: Mostrar cantidad real de tiquetes */}
                      <span className="ticket-quantity-badge">
                        🎟️ {item.ticketQuantity} tiquete(s)
                      </span>
                    </div>

                    {item.reservationType === "temporal" && (
                      <div
                        className={`expiration-time ${
                          item.isExpired ? "expired" : ""
                        }`}
                      >
                        <span className="expiration-icon">⏰</span>
                        <span className="expiration-text">
                          {getExpirationText(item)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="cart-item-route">
                    <div className="route-segment">
                      <div className="route-time">
                        {item.departure?.time || "00:00"}
                      </div>
                      <div className="route-city">
                        {item.departure?.city || "N/A"}
                      </div>
                      <div className="route-airport">
                        {item.departure?.airport || "N/A"}
                      </div>
                      <div className="route-date">
                        {item.departure?.date || "Fecha no disponible"}
                      </div>
                    </div>

                    <div className="route-middle">
                      <div className="route-duration">
                        {item.duration || "2h 00m"}
                      </div>
                      <div className="route-line">
                        <div className="line"></div>
                        <div className="plane-icon">✈️</div>
                      </div>
                      <div className="route-stops">
                        {item.stops || "Directo"}
                      </div>
                    </div>

                    <div className="route-segment">
                      <div className="route-time">
                        {item.arrival?.time || "00:00"}
                      </div>
                      <div className="route-city">
                        {item.arrival?.city || "N/A"}
                      </div>
                      <div className="route-airport">
                        {item.arrival?.airport || "N/A"}
                      </div>
                      <div className="route-date">
                        {item.arrival?.date || "Fecha no disponible"}
                      </div>
                    </div>
                  </div>

                  {/* 🔥 MEJORADO: Información de precios y cantidad */}
                  <div className="price-breakdown">
                    <div className="price-row">
                      <span>Precio unitario ({item.classText}):</span>
                      <span>
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          minimumFractionDigits: 0,
                        }).format(
                          item.unitPrice ||
                            item.priceNumber / item.ticketQuantity
                        )}
                      </span>
                    </div>
                    <div className="price-row">
                      <span>Cantidad:</span>
                      <span>{item.ticketQuantity} tiquete(s)</span>
                    </div>
                    <div className="price-row total">
                      <span>Subtotal:</span>
                      <span>{item.price}</span>
                    </div>
                  </div>

                  {/* INFORMACIÓN DEL BACKEND */}
                  {item.backendData?.desdeBackend && (
                    <div className="backend-info">
                      <div className="backend-badge">📊 Datos del Sistema</div>
                      <div className="backend-details">
                        <span>
                          Asientos: {item.backendData.asientos.join(", ")}
                        </span>
                        <span>•</span>
                        <span>
                          Reserva: {item.backendData.conexion?.substring(0, 8)}
                          ...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* BOTONES DE ACCIÓN */}
                  <div className="cart-item-actions">
                    {item.reservationType === "temporal" && !item.isExpired && (
                      <>
                        <button
                          className="btn-primary"
                          onClick={() => proceedToPurchase(item)}
                        >
                          Comprar Ahora
                        </button>
                        <button
                          className="btn-remove"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Cancelar Reserva
                        </button>
                      </>
                    )}
                    {item.isExpired && (
                      <div className="expired-message">
                        <span className="expired-icon">⏰</span>
                        <span>Esta reserva ha expirado y será eliminada</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total-section">
                <div className="total-line">
                  <span>
                    Subtotal ({getTotalItems()}{" "}
                    {getTotalItems() === 1
                      ? "reserva activa"
                      : "reservas activas"}
                    ):
                  </span>
                  <span>
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(calculateTotal())}
                  </span>
                </div>

                <div className="cart-summary-details">
                  <div className="summary-note">
                    <span className="note-icon">⏰</span>
                    <span>
                      Todas las reservas expiran automáticamente en 24 horas
                    </span>
                  </div>
                  <div className="summary-note warning">
                    <span className="note-icon">⚠️</span>
                    <span>
                      Las reservas expiradas se eliminan automáticamente del
                      sistema
                    </span>
                  </div>
                </div>

                <div className="total-line final">
                  <span>Total estimado:</span>
                  <span className="final-total">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    }).format(calculateTotal())}
                  </span>
                </div>
              </div>

              <div className="cart-notes">
                <p>
                  💡 <strong>Nota:</strong> Todas las reservas se gestionan
                  directamente en el sistema VivaSky.
                </p>
                <p className="expiration-note">
                  ⚠️ <strong>Atención:</strong> Las reservas se eliminan
                  automáticamente después de 24 horas si no se completan.
                </p>
                <p className="expiration-note">
                  🔄 <strong>Actualización automática:</strong> El sistema
                  limpia automáticamente las reservas expiradas cada segundo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Búsqueda de Vuelos */}
      {showSearchModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="destination-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <button
              className="modal-close"
              onClick={() => setShowSearchModal(false)}
            >
              ×
            </button>

            <div className="modal-header">
              <h2>Buscar Nuevos Vuelos</h2>
            </div>

            <div className="modal-content">
              <form className="flight-form" onSubmit={handleSearchFromModal}>
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
                  <div className="input-group">
                    <label>Salida</label>
                    <select
                      value={origin}
                      onChange={(e) => {
                        setOrigin(e.target.value);
                        setDestination("");
                      }}
                      required
                      className={!origin ? "required-empty" : ""}
                    >
                      <option value="">Selecciona una ciudad de origen</option>
                      <optgroup label="🌍 Ciudades Internacionales">
                        {[
                          "Madrid",
                          "Londres",
                          "New York",
                          "Buenos Aires",
                          "Miami",
                        ].map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🇨🇴 Ciudades Colombianas">
                        {[
                          "Bogotá",
                          "Medellín",
                          "Cali",
                          "Barranquilla",
                          "Cartagena",
                          "Cúcuta",
                          "Bucaramanga",
                          "Pereira",
                          "Santa Marta",
                          "Ibagué",
                          "Pasto",
                          "Manizales",
                        ].map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Destino</label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required
                      className={!destination ? "required-empty" : ""}
                      disabled={!origin}
                    >
                      <option value="">
                        {origin
                          ? `Selecciona un destino desde ${origin}`
                          : "Primero selecciona un origen"}
                      </option>
                      {origin && (
                        <>
                          {getAvailableDestinations(origin).some((city) =>
                            [
                              "Madrid",
                              "Londres",
                              "New York",
                              "Buenos Aires",
                              "Miami",
                            ].includes(city)
                          ) && (
                            <optgroup label="🌍 Destinos Internacionales">
                              {getAvailableDestinations(origin)
                                .filter((city) =>
                                  [
                                    "Madrid",
                                    "Londres",
                                    "New York",
                                    "Buenos Aires",
                                    "Miami",
                                  ].includes(city)
                                )
                                .map((city) => (
                                  <option key={city} value={city}>
                                    {city}
                                  </option>
                                ))}
                            </optgroup>
                          )}
                          <optgroup label="🇨🇴 Destinos Colombianos">
                            {getAvailableDestinations(origin)
                              .filter((city) =>
                                [
                                  "Bogotá",
                                  "Medellín",
                                  "Cali",
                                  "Barranquilla",
                                  "Cartagena",
                                  "Cúcuta",
                                  "Bucaramanga",
                                  "Pereira",
                                  "Santa Marta",
                                  "Ibagué",
                                  "Pasto",
                                  "Manizales",
                                ].includes(city)
                              )
                              .map((city) => (
                                <option key={city} value={city}>
                                  {city}
                                </option>
                              ))}
                          </optgroup>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Fecha de salida</label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      min={today}
                    />
                  </div>

                  {tripType === "roundtrip" && (
                    <div className="input-group">
                      <label>Fecha de retorno</label>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        min={departureDate}
                      />
                    </div>
                  )}
                </div>

                <button type="submit" className="search-btn">
                  Buscar vuelos
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
