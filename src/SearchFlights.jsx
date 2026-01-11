import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./App.css";

function SearchFlights() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = location.state || {};

  // Debug de searchParams
  console.log("🔍 SEARCH PARAMS RECIBIDOS:", searchParams);
  console.log("📍 Origen:", searchParams.origin);
  console.log("🎯 Destino:", searchParams.destination);
  console.log("📅 Fecha salida:", searchParams.departureDate);
  console.log("📅 Fecha salida SQL:", searchParams.departureDateSQL);
  console.log("📅 Fecha retorno:", searchParams.returnDate);
  console.log("🔄 Tipo viaje:", searchParams.tripType);
  console.log("🔎 Tipo de búsqueda:", searchParams.searchType);

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [userName, setUserName] = useState("Usuario");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("");

  // 🔥 NUEVA FUNCIÓN: Filtrar vuelos por fecha vigente
  const filterFlightsByDate = (flightsList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a inicio del día

    console.log(
      "📅 Filtrado por fecha vigente - Hoy:",
      today.toISOString().split("T")[0]
    );

    return flightsList.filter((flight) => {
      if (!flight.fecha_salida) return false;

      try {
        // Verificar vuelo de ida
        const departureDate = new Date(flight.fecha_salida);
        departureDate.setHours(0, 0, 0, 0);

        const isDepartureValid = departureDate >= today;

        // Verificar vuelo de retorno si existe
        let isReturnValid = true;
        if (flight.returnFlight && flight.returnFlight.fecha_salida) {
          const returnDate = new Date(flight.returnFlight.fecha_salida);
          returnDate.setHours(0, 0, 0, 0);
          isReturnValid = returnDate >= today;
        }

        const isValid = isDepartureValid && isReturnValid;

        if (!isValid) {
          console.log("❌ Vuelo descartado por fecha:", {
            id: flight.id_vuelo,
            salida: flight.fecha_salida,
            retorno: flight.returnFlight?.fecha_salida,
            valido: isValid,
          });
        }

        return isValid;
      } catch (error) {
        console.error("❌ Error filtrando vuelo por fecha:", error);
        return false;
      }
    });
  };

  // 🔥 Mapa de zonas horarias (UTC offset en horas)
  const timeZones = {
    // Ciudades Colombianas (UTC-5)
    Arauca: -5,
    Armenia: -5,
    Barranquilla: -5,
    Bogotá: -5,
    Bucaramanga: -5,
    Cali: -5,
    Cartagena: -5,
    Cúcuta: -5,
    Florencia: -5,
    Ibagué: -5,
    Leticia: -5,
    Manizales: -5,
    Medellín: -5,
    Mitú: -5,
    Mocoa: -5,
    Montería: -5,
    Neiva: -5,
    Pasto: -5,
    Pereira: -5,
    Popayán: -5,
    "Puerto Carreño": -5,
    Quibdó: -5,
    Riohacha: -5,
    "San Andrés": -5,
    "San José del Guaviare": -5,
    "Santa Marta": -5,
    Sincelejo: -5,
    Tunja: -5,
    Valledupar: -5,
    Villavicencio: -5,
    Yopal: -5,

    // Ciudades Internacionales
    "Buenos Aires": -3, // Argentina (UTC-3)
    Londres: 0, // Reino Unido (UTC+0)
    Madrid: 1, // España (UTC+1) - Horario de verano Europa
    Miami: -4, // USA Este (UTC-4) - Horario de verano
    "New York": -4, // USA Este (UTC-4) - Horario de verano
    "🌍 Ciudades Internacionales": 0, // Default
  };

  // 🔥 Lista de ciudades colombianas para detectar vuelos internacionales
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

  // 🔥 FUNCIÓN: Determinar si un vuelo es internacional
  const isInternationalFlight = (origen, destino) => {
    const esOrigenColombiano = colombianCities.includes(origen);
    const esDestinoColombiano = colombianCities.includes(destino);
    return !esOrigenColombiano || !esDestinoColombiano;
  };

  // 🔥 FUNCIÓN MEJORADA: Obtener diferencia horaria entre dos ciudades
  const getTimeDifference = (origen, destino) => {
    const tzOrigen = timeZones[origen] !== undefined ? timeZones[origen] : -5;
    const tzDestino =
      timeZones[destino] !== undefined ? timeZones[destino] : -5;
    const difference = tzDestino - tzOrigen;

    console.log(`🕐 DIFERENCIA HORARIA CALCULADA:`, {
      origen: origen,
      tzOrigen: tzOrigen,
      destino: destino,
      tzDestino: tzDestino,
      diferencia: `${difference} horas`,
      calculo: `${tzDestino} - ${tzOrigen} = ${difference}`,
    });

    return difference;
  };

  // 🔥 FUNCIÓN HELPER: Limpiar fecha de formato ISO a formato simple - MEJORADA CON DEBUG
  const cleanDate = (dateString) => {
    if (!dateString) {
      console.log("❌ CLEAN DATE - Entrada vacía");
      return null;
    }

    console.log("🔍 CLEAN DATE - Procesando:", {
      entrada: dateString,
      tipo: typeof dateString,
      esDate: dateString instanceof Date,
    });

    try {
      // Si es objeto Date
      if (dateString instanceof Date) {
        const result = dateString.toISOString().split("T")[0];
        console.log("✅ CLEAN DATE - De Date a string:", result);
        return result;
      }

      // Si es string
      if (typeof dateString === "string") {
        // Si ya es formato YYYY-MM-DD
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.log("✅ CLEAN DATE - Ya formato YYYY-MM-DD:", dateString);
          return dateString;
        }

        // Si contiene T (formato ISO)
        if (dateString.includes("T")) {
          const result = dateString.split("T")[0];
          console.log("✅ CLEAN DATE - De ISO a YYYY-MM-DD:", result);
          return result;
        }

        // Intentar parsear como fecha
        const date = new Date(dateString);
        if (!isNaN(date)) {
          const result = date.toISOString().split("T")[0];
          console.log("✅ CLEAN DATE - Parseado a YYYY-MM-DD:", result);
          return result;
        }
      }

      console.warn("⚠️ CLEAN DATE - Formato no reconocido:", dateString);
      return dateString;
    } catch (error) {
      console.error("❌ Error en cleanDate:", error, "input:", dateString);
      return dateString;
    }
  };

  // 🔥 FUNCIÓN CORREGIDA: Calcular llegada para vuelos internacionales CON CAMBIO DE FECHA
  const calculateInternationalArrival = (
    departureTime,
    duration,
    departureDate,
    origen,
    destino
  ) => {
    if (!departureTime || !departureDate) {
      return { time: "00:00", date: departureDate };
    }

    try {
      const [hours, minutes] = departureTime.split(":").map(Number);

      // Parsear fecha/hora de salida en zona de origen
      const cleanDepartureDate = cleanDate(departureDate);
      const [year, month, day] = cleanDepartureDate.split("-").map(Number);
      const departureDateTime = new Date(year, month - 1, day, hours, minutes);

      const durationMinutes = parseDuration(duration);

      // 1. CALCULAR LLEGADA EN ZONA HORARIA DE ORIGEN
      const arrivalDateTimeOriginTZ = new Date(
        departureDateTime.getTime() + durationMinutes * 60 * 1000
      );

      // 2. OBTENER DIFERENCIA HORARIA
      const timeDiff = getTimeDifference(origen, destino);

      // 3. APLICAR DIFERENCIA HORARIA PARA OBTENER HORA LOCAL DESTINO
      const arrivalDateTimeDestTZ = new Date(
        arrivalDateTimeOriginTZ.getTime() + timeDiff * 60 * 60 * 1000
      );

      // Formatear resultados
      const arrivalTime = arrivalDateTimeDestTZ
        .toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(/:/g, ":");

      const arrivalDate = arrivalDateTimeDestTZ.toISOString().split("T")[0];

      console.log(`🌍 CÁLCULO INTERNACIONAL CORREGIDO:`, {
        origen,
        destino,
        salida: `${cleanDepartureDate} ${departureTime}`,
        duracion: `${durationMinutes}min`,
        diferenciaHoraria: `${timeDiff}h`,
        llegadaOrigenTZ: arrivalDateTimeOriginTZ.toLocaleString(),
        llegadaDestinoTZ: arrivalDateTimeDestTZ.toLocaleString(),
        resultado: `${arrivalDate} ${arrivalTime}`,
      });

      return {
        time: arrivalTime,
        date: arrivalDate,
        datetime: arrivalDateTimeDestTZ,
      };
    } catch (error) {
      console.error("❌ Error en cálculo internacional:", error);
      return {
        time: "00:00",
        date: departureDate,
      };
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Calcular llegada para vuelos nacionales - CORREGIDA
  const calculateNationalArrival = (
    departureTime,
    duration,
    departureDate,
    flightInfo = {}
  ) => {
    if (!departureTime || !departureDate) {
      return { time: "00:00", date: departureDate };
    }

    try {
      const [hours, minutes] = departureTime.split(":").map(Number);

      // Limpiar la fecha (remover parte de tiempo si existe)
      const cleanDepartureDate = cleanDate(departureDate);
      const [year, month, day] = cleanDepartureDate.split("-").map(Number);

      console.log("🔍 DEPURACIÓN - Fecha de salida:", {
        original: departureDate,
        limpiada: cleanDepartureDate,
        año: year,
        mes: month,
        día: day,
        horaSalida: hours,
        minutoSalida: minutes,
      });

      // Crear fecha de salida CORRECTAMENTE
      const departureDateTime = new Date(year, month - 1, day, hours, minutes);

      const durationMinutes = parseDuration(duration);

      console.log("🔍 DEPURACIÓN - Cálculo:", {
        fechaSalidaObj: departureDateTime.toLocaleString(),
        duracionMinutos: durationMinutes,
        sumaMilisegundos: durationMinutes * 60 * 1000,
      });

      // Calcular llegada
      const arrivalDateTime = new Date(
        departureDateTime.getTime() + durationMinutes * 60 * 1000
      );

      const arrivalTime = arrivalDateTime
        .toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(/:/g, ":");

      const arrivalDate = arrivalDateTime.toISOString().split("T")[0];

      // Verificar si realmente cambió de día
      const arrivalDay = arrivalDateTime.getDate();
      const departureDay = departureDateTime.getDate();
      const cambiaDia = arrivalDay !== departureDay;

      console.log(`🇨🇴 CÁLCULO NACIONAL CORREGIDO:`, {
        vuelo: flightInfo.id,
        salida: `${cleanDepartureDate} ${departureTime}`,
        duracion: `${durationMinutes}min`,
        horaSalidaObj: departureDateTime.toLocaleString(),
        horaLlegadaObj: arrivalDateTime.toLocaleString(),
        llegada: `${arrivalDate} ${arrivalTime}`,
        diaSalida: departureDay,
        diaLlegada: arrivalDay,
        cambioDia: cambiaDia ? "✅ SI" : "❌ NO",
      });

      return {
        time: arrivalTime,
        date: arrivalDate,
        datetime: arrivalDateTime,
        cambiaDia: cambiaDia,
      };
    } catch (error) {
      console.error("❌ Error en cálculo nacional:", error);
      return {
        time: "00:00",
        date: departureDate,
        cambiaDia: false,
      };
    }
  };

  // 🔥 FUNCIÓN MAESTRA CORREGIDA: Maneja nacionales e internacionales
  const calculateFinalArrival = (flight, isReturnFlight = false) => {
    const flightData = isReturnFlight ? flight.returnFlight : flight;

    if (!flightData) return { time: "00:00", date: flightData?.fecha_salida };

    const isInternational = isInternationalFlight(
      flightData.origen,
      flightData.destino
    );

    let result;

    if (isInternational) {
      result = calculateInternationalArrival(
        formatTime(flightData.hora_salida),
        flightData.duracion,
        cleanDate(flightData.fecha_salida),
        flightData.origen,
        flightData.destino
      );
    } else {
      result = calculateNationalArrival(
        formatTime(flightData.hora_salida),
        flightData.duracion,
        cleanDate(flightData.fecha_salida),
        {
          id: flightData.id_vuelo,
          origen: flightData.origen,
          destino: flightData.destino,
        }
      );

      // 🔥 CORRECCIÓN DE EMERGENCIA: Para vuelos nacionales que no cruzan medianoche
      // Si el vuelo sale y llega el mismo día (no cambiaDia), usar fecha de salida
      if (!result.cambiaDia) {
        console.log(
          "🔄 CORRECCIÓN: Vuelo no cambia de día, usando fecha de salida"
        );
        result.date = cleanDate(flightData.fecha_salida);
      }
    }

    console.log("🎯 CALCULATE FINAL ARRIVAL - Resultado final:", {
      vuelo: flightData.id_vuelo,
      esInternacional: isInternational,
      fechaSalida: cleanDate(flightData.fecha_salida),
      fechaLlegada: result.date,
      horaSalida: formatTime(flightData.hora_salida),
      horaLlegada: result.time,
      cambiaDia: result.cambiaDia,
    });

    return result;
  };

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = () => {
      const authToken =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");
      const userData =
        localStorage.getItem("userData") || sessionStorage.getItem("userData");

      if (authToken && userData) {
        try {
          const user = JSON.parse(userData);
          setUserName(user.nombre || "Usuario");
          setUserRole(user.tipo_usuario || user.role || "Usuario");
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }
    };

    checkAuth();
  }, []);

  // 🔥 FUNCIÓN MEJORADA: Verificar si puede usar carrito
  const canUseCart = () => {
    const adminRoles = ["Administrador", "administrador", "admin", "root"];
    const clientRoles = ["Cliente", "cliente", "customer"];

    // Solo usuarios normales (no admin y no cliente) pueden usar carrito
    return !adminRoles.includes(userRole) && !clientRoles.includes(userRole);
  };

  // Cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("userData");
    navigate("/");
  };

  // 🔥 FUNCIÓN: Debug detallado del objeto de duración
  const debugDurationObject = (durationObj) => {
    console.log("🔍 DEBUG DETALLADO DEL OBJETO DURACIÓN:");
    console.log("Tipo:", typeof durationObj);
    console.log("Estructura completa:", JSON.stringify(durationObj, null, 2));
    console.log("Propiedades disponibles:", Object.keys(durationObj));

    // Mostrar todos los valores de las propiedades
    Object.keys(durationObj).forEach((key) => {
      console.log(
        `- ${key}:`,
        durationObj[key],
        `(tipo: ${typeof durationObj[key]})`
      );
    });
  };

  // 🔥 FUNCIÓN CORREGIDA: Parsear duración que puede venir como objeto
  const parseDuration = (duration) => {
    console.log(
      "🕐 Duración recibida del backend:",
      duration,
      "Tipo:",
      typeof duration
    );

    if (!duration) {
      console.log("❌ Duración vacía, usando 60min por defecto");
      return 60;
    }

    // 1. Si es un OBJETO (lo que está pasando)
    if (typeof duration === "object" && duration !== null) {
      console.log("🔍 Analizando objeto de duración:");
      debugDurationObject(duration);

      // ✅ CORRECCIÓN: Sumar horas y minutos correctamente
      if (duration.hours !== undefined || duration.minutes !== undefined) {
        const horas = duration.hours || 0;
        const minutos = duration.minutes || 0;
        const totalMinutes = horas * 60 + minutos; // ← ¡CORRECCIÓN APLICADA!
        console.log("✅ Duración CORRECTA desde objeto {hours, minutes}:", {
          horas: horas,
          minutos: minutos,
          totalMinutos: totalMinutes,
        });
        return totalMinutes;
      }

      if (duration.horas !== undefined || duration.minutos !== undefined) {
        const horas = duration.horas || 0;
        const minutos = duration.minutos || 0;
        const totalMinutes = horas * 60 + minutos; // ← ¡CORRECCIÓN APLICADA!
        console.log("✅ Duración CORRECTA desde objeto {horas, minutos}:", {
          horas: horas,
          minutos: minutos,
          totalMinutos: totalMinutes,
        });
        return totalMinutes;
      }

      // Intentar extraer la duración de diferentes propiedades posibles
      const possibleProperties = [
        "duracion",
        "duration",
        "tiempo",
        "time",
        "horas",
        "hours",
        "hhmm",
        "hh_mm",
        "value",
        "valor",
        "total",
        "total_minutes",
        "minutos",
        "minutes",
        "mins",
        "min",
      ];

      for (const prop of possibleProperties) {
        if (
          duration[prop] !== undefined &&
          duration[prop] !== null &&
          duration[prop] !== ""
        ) {
          console.log(`✅ Encontrada propiedad "${prop}":`, duration[prop]);
          // Llamar recursivamente con el valor encontrado
          return parseDuration(duration[prop]);
        }
      }

      // Si el objeto tiene formato ISO o timestamp
      if (duration.iso || duration.timestamp || duration.date) {
        const dateStr = duration.iso || duration.timestamp || duration.date;
        console.log("🔄 Intentando parsear desde fecha ISO:", dateStr);
        return parseDuration(dateStr);
      }

      console.log("❌ No se pudo extraer duración del objeto:", duration);
      return 120;
    }

    // 2. Si ya es un número (minutos)
    if (typeof duration === "number" && isFinite(duration)) {
      console.log("✅ Duración como número:", duration, "minutos");
      return Math.max(0, Math.round(duration));
    }

    // 3. Si es un string en formato "HH:MM" (lo que envía tu backend)
    if (typeof duration === "string") {
      const str = duration.trim();
      console.log("🔍 Procesando duración como string:", str);

      // --- FORMATO PRINCIPAL: "HH:MM" (ej: "01:30", "00:46") ---
      const timeMatch = str.match(/^(\d{1,2}):([0-5]\d)$/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const totalMinutes = hours * 60 + minutes;

        console.log("✅ Duración parseada desde HH:MM:", {
          horas: hours,
          minutos: minutes,
          totalMinutos: totalMinutes,
        });

        return totalMinutes;
      }

      // --- FORMATO ISO DATE: "1970-01-01T00:46:00.000Z" ---
      if (str.includes("T") && (str.includes("Z") || str.includes("-"))) {
        try {
          const date = new Date(str);
          if (!isNaN(date)) {
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();
            const totalMinutes = hours * 60 + minutes;
            console.log(
              "✅ Duración parseada desde ISO Date:",
              totalMinutes,
              "minutos"
            );
            return totalMinutes;
          }
        } catch (e) {
          console.log("❌ Error parseando ISO Date:", e);
        }
      }

      // --- FORMATO ALTERNATIVO: solo minutos (ej: "90") ---
      const numberMatch = str.match(/^\d+$/);
      if (numberMatch) {
        const totalMinutes = parseInt(str, 10);
        console.log(
          "✅ Duración como minutos directos:",
          totalMinutes,
          "minutos"
        );
        return totalMinutes;
      }

      console.log("⚠️ Formato de duración no reconocido:", str);
    }

    // 4. Valor por defecto si no se puede parsear
    console.log(
      `❌ No se pudo parsear "${duration}", usando 120min por defecto`
    );
    return 120;
  };

  // 🔥 FUNCIÓN MEJORADA: Determinar el tipo de búsqueda
  const getSearchTypeDescription = () => {
    const { origin, destination, departureDate, returnDate, tripType } =
      searchParams;

    const parts = [];

    if (origin) parts.push(`desde ${origin}`);
    if (destination) parts.push(`hacia ${destination}`);
    if (departureDate) parts.push(`salida ${formatDate(departureDate)}`);
    if (returnDate && tripType === "roundtrip")
      parts.push(`regreso ${formatDate(returnDate)}`);

    if (parts.length === 0) return "Búsqueda general de vuelos";

    return `Vuelos ${parts.join(" | ")}`;
  };

  // 🔥 FUNCIÓN COMPLETAMENTE MODIFICADA Y CORREGIDA CON DEBUG EXTENDIDO: Buscar vuelos usando el backend existente
  const fetchFlights = async () => {
    const { origin, destination, departureDate, returnDate, tripType } =
      searchParams;

    console.log("🔍 PARÁMETROS DE BÚSQUEDA:", {
      origin,
      destination,
      departureDate,
      returnDate,
      tripType,
    });

    // 🔥 VALIDACIÓN FLEXIBLE: Solo requiere al menos un campo
    if (!origin && !destination && !departureDate && !returnDate) {
      setErrorMsg("Por favor completa al menos un campo para buscar vuelos.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // 🔥 CONSTRUIR PARÁMETROS PARA EL BACKEND EXISTENTE
      const params = new URLSearchParams();

      // Mapear nombres del frontend al backend
      if (origin) params.append("origen", origin);
      if (destination) params.append("destino", destination);

      // 🔥 CORREGIR: Mapear tripType a tipo_viaje que el backend espera
      if (tripType === "roundtrip") {
        params.append("tipo_viaje", "idayvuelta");
      } else if (tripType === "oneway") {
        params.append("tipo_viaje", "soloida");
      }

      // Usar las fechas según corresponda
      if (departureDate) {
        const departureDateSQL =
          searchParams.departureDateSQL ||
          new Date(departureDate).toISOString().split("T")[0];
        params.append("fecha_salida", departureDateSQL);
      }

      if (returnDate && tripType === "roundtrip") {
        const returnDateSQL = new Date(returnDate).toISOString().split("T")[0];
        params.append("fecha_regreso", returnDateSQL);
      }

      // 🔥 DEBUG DETALLADO DE LOS PARÁMETROS ENVIADOS
      console.log("🎯 PARÁMETROS ENVIADOS AL BACKEND:");
      console.log("  - origen:", origin);
      console.log("  - destino:", destination);
      console.log(
        "  - tipo_viaje:",
        tripType === "roundtrip" ? "idayvuelta" : "soloida"
      );
      console.log("  - fecha_salida:", departureDate);
      console.log("  - fecha_regreso:", returnDate);
      console.log("  - Query string completo:", params.toString());

      // 🔥 USAR EL ENDPOINT EXISTENTE DEL BACKEND
      const url = `http://localhost:5000/api/search-flights?${params.toString()}`;
      console.log("🔄 URL de búsqueda CORREGIDA:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Error HTTP: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("📦 Respuesta COMPLETA del backend:", data);

      // 🔥 PROCESAR RESPUESTA SEGÚN LA ESTRUCTURA DEL BACKEND
      let vuelosIda = data.vuelosIda || [];
      let vuelosRegreso = data.vuelosRegreso || [];

      console.log(
        `✈️ Vuelos encontrados - Ida: ${vuelosIda.length}, Regreso: ${vuelosRegreso.length}`
      );

      // 🔥 NUEVO: FILTRAR VUELOS POR FECHA VIGENTE
      vuelosIda = filterFlightsByDate(vuelosIda);
      vuelosRegreso = filterFlightsByDate(vuelosRegreso);

      console.log(
        `✅ Vuelos vigentes - Ida: ${vuelosIda.length}, Regreso: ${vuelosRegreso.length}`
      );

      // 🔥 DEBUG DETALLADO: Ver estructura de los vuelos
      if (vuelosIda.length > 0) {
        console.log(
          "🔍 PRIMER VUELO DE IDA:",
          JSON.stringify(vuelosIda[0], null, 2)
        );
      } else {
        console.log("❌ NO HAY VUELOS DE IDA ENCONTRADOS");
      }

      if (vuelosRegreso.length > 0) {
        console.log(
          "🔍 PRIMER VUELO DE REGRESO:",
          JSON.stringify(vuelosRegreso[0], null, 2)
        );
      } else {
        console.log("❌ NO HAY VUELOS DE REGRESO ENCONTRADOS");
      }

      // 🔥 DEBUG EXTRA: ANALIZAR CIUDADES EN DETALLE
      console.log("🎯 DEBUG DETALLADO DE CIUDADES:");
      console.log("=== VUELOS DE IDA ===");
      vuelosIda.forEach((v, i) => {
        console.log(
          `Ida ${i + 1}: ${v.origen} -> ${v.destino} (ID: ${v.id_vuelo})`
        );
      });

      console.log("=== VUELOS DE REGRESO ===");
      vuelosRegreso.forEach((v, i) => {
        console.log(
          `Regreso ${i + 1}: ${v.origen} -> ${v.destino} (ID: ${v.id_vuelo})`
        );
      });

      // 🔥 ANÁLISIS DEL PROBLEMA: ¿POR QUÉ NO HAY VUELOS DE REGRESO?
      console.log("🔍 ANÁLISIS DEL PROBLEMA DE REGRESO:");
      console.log("  - Se buscó regreso de:", destination, "->", origin);
      console.log("  - Fecha de regreso:", returnDate);
      console.log("  - Vuelos de regreso encontrados:", vuelosRegreso.length);

      if (vuelosRegreso.length === 0) {
        console.log(
          "❌ PROBLEMA IDENTIFICADO: No hay vuelos de regreso en la base de datos"
        );
        console.log("   Para la ruta:", destination, "->", origin);
        console.log("   En la fecha:", returnDate);
      }

      // 🔥 LÓGICA COMPLETAMENTE CORREGIDA PARA COMBINAR VUELOS
      let processedFlights = [];

      if (tripType === "roundtrip") {
        console.log("🔄 PROCESANDO VUELOS IDA Y VUELTA...");

        // 🔥 SI HAY VUELOS DE REGRESO - Intentar combinarlos
        if (vuelosRegreso.length > 0) {
          console.log("🔍 Intentando combinar vuelos ida y regreso...");

          vuelosIda.forEach((vueloIda) => {
            // Solo procesar vuelos activos
            if (vueloIda.estado !== "activo") {
              console.log(
                `❌ Vuelo ida ${vueloIda.id_vuelo} no activo, omitiendo`
              );
              return;
            }

            console.log(
              `🔍 Buscando regreso para vuelo ida: ${vueloIda.origen} -> ${vueloIda.destino}`
            );

            vuelosRegreso.forEach((vueloRegreso) => {
              if (vueloRegreso.estado !== "activo") {
                console.log(
                  `❌ Vuelo regreso ${vueloRegreso.id_vuelo} no activo, omitiendo`
                );
                return;
              }

              console.log(
                `🔍 Evaluando regreso: ${vueloRegreso.origen} -> ${vueloRegreso.destino}`
              );

              // 🔥 CRITERIO FLEXIBLE MEJORADO: Verificar que sean ciudades complementarias
              const esCombinacionValida =
                (vueloIda.destino === vueloRegreso.origen &&
                  vueloIda.origen === vueloRegreso.destino) ||
                vueloIda.destino
                  .toLowerCase()
                  .includes(vueloRegreso.origen.toLowerCase()) ||
                vueloRegreso.origen
                  .toLowerCase()
                  .includes(vueloIda.destino.toLowerCase());

              console.log(
                `  - Combinación: ${vueloIda.origen}->${vueloIda.destino} + ${vueloRegreso.origen}->${vueloRegreso.destino}`
              );
              console.log(`  - Válida: ${esCombinacionValida}`);

              if (esCombinacionValida) {
                console.log(`✅ Combinación válida encontrada!`);

                const combinedFlight = {
                  ...vueloIda,
                  tripType: "roundtrip",
                  isRoundTrip: true,
                  hasReturnFlight: true,
                  returnFlight: vueloRegreso,
                  precio_total:
                    (Number(vueloIda.costo_economico) || 0) +
                    (Number(vueloRegreso.costo_economico) || 0),
                  precio_total_vip:
                    (Number(vueloIda.costo_vip) || 0) +
                    (Number(vueloRegreso.costo_vip) || 0),
                  combinationId: `combo_${vueloIda.id_vuelo}_${vueloRegreso.id_vuelo}`,
                };

                processedFlights.push(combinedFlight);
              }
            });
          });

          console.log(
            `🔄 Combinaciones encontradas: ${processedFlights.length}`
          );
        }

        // 🔥 SI NO HAY COMBINACIONES O NO HAY VUELOS DE REGRESO, MOSTRAR VUELOS DE IDA CON INDICACIÓN
        if (processedFlights.length === 0) {
          console.log(
            "⚠️ No se pudieron crear combinaciones, mostrando vuelos de ida"
          );

          processedFlights = vuelosIda
            .filter((vuelo) => vuelo.estado === "activo")
            .map((vuelo) => ({
              ...vuelo,
              tripType: "roundtrip",
              isRoundTrip: true,
              hasReturnFlight: false, // Indica que NO tiene vuelo de regreso
              precio_total: Number(vuelo.costo_economico) || 0,
              precio_total_vip: Number(vuelo.costo_vip) || 0,
              missingReturn: true, // Para mostrar mensaje al usuario
            }));

          // 🔥 MENSAJES INFORMATIVOS MEJORADOS
          if (vuelosRegreso.length === 0) {
            const mensajeError = `✈️ Encontramos vuelos de ida pero no de regreso para las fechas seleccionadas. 
            Buscamos vuelos de ${destination} a ${origin} para el ${returnDate} pero no hay disponibilidad.
            Puedes reservar solo el vuelo de ida o intentar con otras fechas.`;

            console.log("📢 Mensaje de error al usuario:", mensajeError);
            setErrorMsg(mensajeError);
          } else {
            setErrorMsg(
              "🔄 Encontramos vuelos de ida y regreso por separado, pero no pudimos combinarlos automáticamente. " +
                "Mostrando vuelos de ida disponibles."
            );
          }
        }
      } else {
        // 🔥 PARA SOLO IDA O BÚSQUEDAS SIN REGRESO
        console.log("✈️ Procesando vuelos solo ida");
        processedFlights = vuelosIda
          .filter((vuelo) => vuelo.estado === "activo")
          .map((vuelo) => ({
            ...vuelo,
            tripType: tripType || "oneway",
            isRoundTrip: false,
            hasReturnFlight: false,
            precio_total: Number(vuelo.costo_economico) || 0,
            precio_total_vip: Number(vuelo.costo_vip) || 0,
          }));
      }

      console.log("✈️ Vuelos procesados finales:", processedFlights.length);
      console.log("📋 Detalle vuelos procesados:", processedFlights);

      // 🔥 DEBUG FINAL DEL ESTADO
      console.log("🎯 ESTADO FINAL:");
      console.log("  - Vuelos a mostrar:", processedFlights.length);
      console.log("  - Hay error:", errorMsg);
      console.log("  - Loading:", loading);

      setFlights(processedFlights);

      // 🔥 MENSAJES INFORMATIVOS MEJORADOS
      if (processedFlights.length === 0) {
        if (vuelosIda.length === 0 && vuelosRegreso.length === 0) {
          setErrorMsg(
            `No se encontraron vuelos que coincidan con tu búsqueda: ${getSearchTypeDescription()}`
          );
        }
      }
    } catch (error) {
      console.error("❌ Error completo al buscar vuelos:", error);
      setErrorMsg(`Error al buscar vuelos: ${error.message}`);
      setFlights([]);
    } finally {
      setLoading(false);
      console.log("🏁 Búsqueda finalizada, loading: false");
    }
  };

  useEffect(() => {
    fetchFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Formatear precio en COP
  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // ✅ FUNCIÓN CORREGIDA: Formatear hora (maneja ISO o texto plano)
  const formatTime = (timeString) => {
    if (!timeString) return "00:00";

    try {
      const date = new Date(timeString);
      if (!isNaN(date)) {
        return date.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
      if (typeof timeString === "string" && timeString.includes(" ")) {
        return timeString.split(" ")[1]?.substring(0, 5) || "00:00";
      }
      return timeString.substring(0, 5);
    } catch {
      return "00:00";
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Formatear fecha (maneja zona horaria correctamente)
  const formatDate = (dateString) => {
    if (!dateString) return "Fecha no disponible";

    try {
      // Si la fecha ya está en formato ISO (YYYY-MM-DD), manejarla directamente
      if (
        typeof dateString === "string" &&
        dateString.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        const [year, month, day] = dateString.split("-").map(Number);
        // Crear fecha en zona horaria local para evitar desplazamientos
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }

      // Para otros formatos, usar el método anterior
      const date = new Date(dateString);
      if (!isNaN(date)) {
        return date.toLocaleDateString("es-CO", {
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

  // ✅ NUEVA FUNCIÓN CORREGIDA: Formatear fecha corta (vie, 12 nov) - CORREGIDA
  const formatShortDate = (dateString) => {
    if (!dateString) return "Fecha no disponible";

    try {
      // Limpiar la fecha primero
      const cleanDateStr = cleanDate(dateString);

      // Si está vacío después de limpiar
      if (!cleanDateStr) return "Fecha no disponible";

      console.log("🔍 FORMAT SHORT DATE - Entrada:", {
        original: dateString,
        limpiada: cleanDateStr,
        tipoOriginal: typeof dateString,
      });

      // Parsear la fecha limpia
      const [year, month, day] = cleanDateStr.split("-").map(Number);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.log("❌ FORMAT SHORT DATE - Error parseando:", cleanDateStr);
        return "Fecha no disponible";
      }

      // Crear fecha en zona horaria local
      const date = new Date(year, month - 1, day);

      if (isNaN(date.getTime())) {
        console.log("❌ FORMAT SHORT DATE - Fecha inválida creada");
        return "Fecha no disponible";
      }

      const formatted = date.toLocaleDateString("es-CO", {
        weekday: "short", // ej: "vie"
        day: "numeric", // ej: "1"
        month: "short", // ej: "nov"
      });

      console.log("✅ FORMAT SHORT DATE - Resultado:", {
        fechaInput: cleanDateStr,
        fechaObj: date.toLocaleDateString(),
        formateada: formatted,
      });

      return formatted;
    } catch (error) {
      console.error(
        "❌ Error en formatShortDate:",
        error,
        "input:",
        dateString
      );
      return "Fecha no disponible";
    }
  };

  // 🔥 FUNCIÓN MEJORADA: Formatear duración para mostrar
  const formatDuration = (duration) => {
    const totalMinutes = parseDuration(duration);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  // 🔥 FUNCIÓN CORREGIDA: Manejar selección de vuelo con precios correctos
  const handleSelectFlight = (flight) => {
    if (!isAuthenticated) {
      alert("Debes iniciar sesión para reservar un vuelo");
      navigate("/login", {
        state: {
          from: "/search-flights",
          searchParams: searchParams,
        },
      });
      return;
    }

    // 🔥 CALCULAR LLEGADAS CON NUEVO SISTEMA
    const llegadaIda = calculateFinalArrival(flight, false);
    const llegadaRetorno = flight.returnFlight
      ? calculateFinalArrival(flight, true)
      : null;

    // 🔥 DEBUG: VER PRECIOS ORIGINALES DEL VUELO
    console.log("🔍 PRECIOS ORIGINALES DEL VUELO:", {
      costo_economico: flight.costo_economico,
      costo_vip: flight.costo_vip,
      precio_total: flight.precio_total,
      precio_total_vip: flight.precio_total_vip,
      returnFlight: flight.returnFlight
        ? {
            costo_economico: flight.returnFlight.costo_economico,
            costo_vip: flight.returnFlight.costo_vip,
          }
        : null,
    });

    // Preparar datos del vuelo para ReserveFlight
    const flightData = {
      // Datos del vuelo de ida
      flightNumber: flight.id_vuelo,
      airline: "VivaSky Airlines",
      price: formatPrice(flight.costo_economico), // 🔥 CORREGIDO: Usar costo_economico individual
      priceNumber: Number(flight.costo_economico) || 0, // 🔥 CORREGIDO: Precio individual de ida
      costo_vip: Number(flight.costo_vip) || 0, // 🔥 CORREGIDO: Precio VIP individual de ida
      duration: formatDuration(flight.duracion),
      stops: "Directo",
      departure: {
        city: flight.origen,
        airport: flight.origen,
        time: formatTime(flight.hora_salida),
        date: formatDate(flight.fecha_salida),
        isInternational: !colombianCities.includes(flight.origen),
      },
      arrival: {
        city: flight.destino,
        airport: flight.destino,
        time: llegadaIda.time,
        date: formatDate(llegadaIda.date),
        isInternational: !colombianCities.includes(flight.destino),
      },

      // 🔥 Datos del vuelo de retorno si existe - CON PRECIOS INDIVIDUALES CORRECTOS
      returnFlight: flight.returnFlight
        ? {
            flightNumber: flight.returnFlight.id_vuelo,
            airline: "VivaSky Airlines",
            price: formatPrice(flight.returnFlight.costo_economico), // 🔥 CORREGIDO
            priceNumber: Number(flight.returnFlight.costo_economico) || 0, // 🔥 CORREGIDO: Precio individual de retorno
            costo_vip: Number(flight.returnFlight.costo_vip) || 0, // 🔥 CORREGIDO: Precio VIP individual de retorno
            duration: formatDuration(flight.returnFlight.duracion),
            stops: "Directo",
            departure: {
              city: flight.returnFlight.origen,
              airport: flight.returnFlight.origen,
              time: formatTime(flight.returnFlight.hora_salida),
              date: formatDate(flight.returnFlight.fecha_salida),
              isInternational: !colombianCities.includes(
                flight.returnFlight.origen
              ),
            },
            arrival: {
              city: flight.returnFlight.destino,
              airport: flight.returnFlight.destino,
              time: llegadaRetorno.time,
              date: formatDate(llegadaRetorno.date),
              isInternational: !colombianCities.includes(
                flight.returnFlight.destino
              ),
            },
          }
        : null,

      isRoundTrip: flight.isRoundTrip,
      hasReturnFlight: flight.hasReturnFlight,
      searchParams: searchParams,
      isInternational: isInternationalFlight(flight.origen, flight.destino),
    };

    console.log("🎫 Datos del vuelo para reserva (CORREGIDOS):", flightData);

    // Navegar a ReserveFlight con los datos
    navigate("/reserve-flight", {
      state: {
        flight: flightData,
        searchParams: searchParams,
      },
    });
  };

  // 🔥 FUNCIÓN CORREGIDA: Manejar agregar al carrito con precios correctos
  const handleAddToCart = (flight) => {
    if (!isAuthenticated) {
      alert("Debes iniciar sesión para agregar vuelos al carrito");
      navigate("/login", {
        state: {
          from: "/search-flights",
          searchParams: searchParams,
        },
      });
      return;
    }

    if (!canUseCart()) {
      alert("⛔ Tu tipo de usuario no puede agregar vuelos al carrito");
      return;
    }

    // 🔥 CALCULAR LLEGADAS CON NUEVO SISTEMA
    const llegadaIda = calculateFinalArrival(flight, false);
    const llegadaRetorno = flight.returnFlight
      ? calculateFinalArrival(flight, true)
      : null;

    // Preparar datos del vuelo para el carrito
    const cartItem = {
      id: flight.combinationId || `flight_${flight.id_vuelo}_${Date.now()}`,
      flightNumber: `VS${flight.id_vuelo}`,
      airline: "VivaSky Airlines",
      price: formatPrice(flight.costo_economico), // 🔥 CORREGIDO
      priceNumber: Number(flight.costo_economico) || 0, // 🔥 CORREGIDO
      costo_vip: Number(flight.costo_vip) || 0, // 🔥 CORREGIDO
      duration: formatDuration(flight.duracion),
      stops: "Directo",
      departure: {
        city: flight.origen,
        airport: flight.origen,
        time: formatTime(flight.hora_salida),
        date: formatDate(flight.fecha_salida),
        isInternational: !colombianCities.includes(flight.origen),
      },
      arrival: {
        city: flight.destino,
        airport: flight.destino,
        time: llegadaIda.time,
        date: formatDate(llegadaIda.date),
        isInternational: !colombianCities.includes(flight.destino),
      },
      returnFlight: flight.returnFlight
        ? {
            flightNumber: `VS${flight.returnFlight.id_vuelo}`,
            departure: {
              city: flight.returnFlight.origen,
              airport: flight.returnFlight.origen,
              time: formatTime(flight.returnFlight.hora_salida),
              date: formatDate(flight.returnFlight.fecha_salida),
              isInternational: !colombianCities.includes(
                flight.returnFlight.origen
              ),
            },
            arrival: {
              city: flight.returnFlight.destino,
              airport: flight.returnFlight.destino,
              time: llegadaRetorno.time,
              date: formatDate(llegadaRetorno.date),
              isInternational: !colombianCities.includes(
                flight.returnFlight.destino
              ),
            },
            duration: formatDuration(flight.returnFlight.duracion),
            // 🔥 AGREGAR PRECIOS INDIVIDUALES AL VUELO DE RETORNO
            priceNumber: Number(flight.returnFlight.costo_economico) || 0,
            costo_vip: Number(flight.returnFlight.costo_vip) || 0,
          }
        : null,
      isRoundTrip: flight.isRoundTrip,
      hasReturnFlight: flight.hasReturnFlight,
      searchParams: searchParams,
      isInternational: isInternationalFlight(flight.origen, flight.destino),
    };

    console.log("🛒 Item agregado al carrito (CORREGIDO):", cartItem);

    // Obtener carrito actual del localStorage
    const currentCart = JSON.parse(
      localStorage.getItem("vivasky_cart") || "[]"
    );

    // Verificar si el vuelo ya está en el carrito
    const isAlreadyInCart = currentCart.some((item) => item.id === cartItem.id);

    if (isAlreadyInCart) {
      alert("✈️ Este vuelo ya está en tu carrito");
      return;
    }

    // Agregar al carrito
    const updatedCart = [...currentCart, cartItem];
    localStorage.setItem("vivasky_cart", JSON.stringify(updatedCart));

    alert("✅ Vuelo agregado al carrito");
  };

  // 🔥 FUNCIÓN: Obtener contador del carrito
  const getCartItemCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem("vivasky_cart") || "[]");
      return cart.length;
    } catch {
      return 0;
    }
  };

  // ✅ Función para nueva búsqueda - redirige al home
  const handleNewSearch = () => {
    navigate("/");
  };

  // ✅ Función para volver al home
  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <div className="app">
      {/* 🔹 HEADER */}
      <header className="header">
        <div
          className="logo-container"
          onClick={handleBackToHome}
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
          {isAuthenticated ? (
            <div className="user-welcome">
              <span>Hola, {userName}</span>

              {/* 🔥 MOSTRAR CARRITO SOLO SI PUEDE USARLO */}
              {canUseCart() && (
                <button
                  className="nav-btn cart-btn"
                  onClick={() => navigate("/cart")}
                  style={{ position: "relative", marginRight: "10px" }}
                >
                  🛒 Carrito
                  {getCartItemCount() > 0 && (
                    <span className="cart-badge">{getCartItemCount()}</span>
                  )}
                </button>
              )}

              <button className="logout-btn" onClick={handleLogout}>
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <>
              <button className="nav-btn" onClick={() => navigate("/login")}>
                Iniciar Sesión
              </button>
              <button className="nav-btn" onClick={() => navigate("/register")}>
                Registrarse
              </button>
            </>
          )}
        </nav>

        <button className="back-btn" onClick={handleNewSearch}>
          Nueva Búsqueda
        </button>
      </header>

      {/* 🔹 CONTENIDO PRINCIPAL */}
      <main className="main-content">
        <div className="search-header">
          <h2>✈️ Resultados de búsqueda</h2>
          <div className="search-summary">
            <div className="search-description">
              <h3>{getSearchTypeDescription()}</h3>
            </div>
            <div className="search-params">
              {searchParams.origin && (
                <span>
                  <strong>Origen:</strong> {searchParams.origin}
                </span>
              )}
              {searchParams.destination && (
                <span>
                  <strong>Destino:</strong> {searchParams.destination}
                </span>
              )}
              {searchParams.departureDate && (
                <span>
                  <strong>Fecha salida:</strong>{" "}
                  {formatDate(searchParams.departureDate)}
                </span>
              )}
              {searchParams.tripType === "roundtrip" &&
                searchParams.returnDate && (
                  <span>
                    <strong>Fecha regreso:</strong>{" "}
                    {formatDate(searchParams.returnDate)}
                  </span>
                )}
              <span>
                <strong>Tipo:</strong>{" "}
                {searchParams.tripType === "roundtrip"
                  ? "Ida y Vuelta"
                  : "Solo Ida"}
              </span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Cargando vuelos disponibles...</p>
          </div>
        )}

        {errorMsg && (
          <div className="error-container">
            <div className="error-icon">❌</div>
            <h3>No se encontraron vuelos</h3>
            <p>{errorMsg}</p>
            <button className="back-btn" onClick={handleNewSearch}>
              Intentar nueva búsqueda
            </button>
          </div>
        )}

        {!loading && !errorMsg && (
          <div className="flights-results-container">
            <div className="results-info">
              <h3>Vuelos disponibles ({flights.length})</h3>
              <p>
                Selecciona un vuelo para continuar con tu reserva
                {canUseCart() && " o agrégalo al carrito"}
              </p>
            </div>

            <div className="flights-grid-enhanced">
              {flights.length > 0 ? (
                flights.map((flight) => {
                  const isRoundTrip = flight.isRoundTrip;
                  const hasReturnFlight =
                    flight.hasReturnFlight && flight.returnFlight;
                  const isInternational = isInternationalFlight(
                    flight.origen,
                    flight.destino
                  );
                  const missingReturn = flight.missingReturn; // Nueva propiedad

                  // 🔥 CALCULAR LLEGADAS CON NUEVO SISTEMA
                  const llegadaIda = calculateFinalArrival(flight, false);
                  const llegadaRetorno = hasReturnFlight
                    ? calculateFinalArrival(flight, true)
                    : null;

                  // 🔥 DEBUG EXTRA: Verificar fechas
                  console.log("🔍 DEBUG RENDER - Vuelo:", flight.id_vuelo, {
                    fechaSalidaOriginal: flight.fecha_salida,
                    fechaSalidaLimpia: cleanDate(flight.fecha_salida),
                    llegadaIda: llegadaIda,
                    llegadaIdaDate: llegadaIda.date,
                    llegadaIdaDateLimpia: cleanDate(llegadaIda.date),
                  });

                  // 🔥 USAR FECHAS CORRECTAS
                  const fechaSalida = formatDate(flight.fecha_salida);
                  const fechaSalidaCorta = formatShortDate(flight.fecha_salida);
                  const fechaLlegadaCorta = formatShortDate(llegadaIda.date);
                  const horaSalida = formatTime(flight.hora_salida);

                  const duracion = formatDuration(flight.duracion);

                  // 🔥 Datos del vuelo de retorno
                  const fechaRetorno = hasReturnFlight
                    ? formatDate(flight.returnFlight.fecha_salida)
                    : "";
                  const fechaRetornoCorta = hasReturnFlight
                    ? formatShortDate(flight.returnFlight.fecha_salida)
                    : "";
                  const fechaLlegadaRetornoCorta = hasReturnFlight
                    ? formatShortDate(llegadaRetorno.date)
                    : "";
                  const horaSalidaRetorno = hasReturnFlight
                    ? formatTime(flight.returnFlight.hora_salida)
                    : "";

                  const duracionRetorno = hasReturnFlight
                    ? formatDuration(flight.returnFlight.duracion)
                    : "";

                  return (
                    <div
                      key={flight.combinationId || flight.id_vuelo}
                      className={`flight-card-enhanced ${
                        isRoundTrip ? "with-return" : ""
                      } ${isInternational ? "international-flight" : ""} ${
                        missingReturn ? "missing-return" : ""
                      }`}
                    >
                      <div className="flight-card-header">
                        <div className="airline-info">
                          <span className="airline-logo">✈️</span>
                          <div>
                            <h4>VivaSky Airlines</h4>
                            <span className="flight-number">
                              {isRoundTrip ? "🔄 Combo " : "VSK-"}
                              {flight.id_vuelo}
                              {hasReturnFlight &&
                                ` + VSK-${flight.returnFlight.id_vuelo}`}
                              {isInternational && (
                                <span className="international-badge">
                                  🌍 Internacional
                                </span>
                              )}
                              {isRoundTrip && (
                                <span className="round-trip-badge">
                                  {hasReturnFlight
                                    ? "Ida y Vuelta"
                                    : "Solo Ida (Falta regreso)"}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flight-price">
                          {formatPrice(flight.precio_total)}
                          <span className="price-note">
                            {isRoundTrip && hasReturnFlight
                              ? "económico (ida y vuelta)"
                              : "económico"}
                          </span>
                        </div>
                      </div>

                      {/* 🔥 ALERTA SI FALTA VUELO DE REGRESO */}
                      {missingReturn && (
                        <div className="missing-return-alert">
                          <span>⚠️</span>
                          <span>
                            No encontramos vuelo de regreso para la fecha
                            seleccionada
                          </span>
                        </div>
                      )}

                      {/* VUELO DE IDA */}
                      <div className="flight-route">
                        <div className="route-segment">
                          <div className="time">{horaSalida}</div>
                          <div className="place">
                            <div className="city">{flight.origen}</div>
                            <div className="airport">{flight.origen}</div>
                          </div>
                          <div className="date">{fechaSalidaCorta}</div>
                        </div>

                        <div className="route-middle">
                          <div className="duration">{duracion}</div>
                          <div className="route-line">
                            <div className="line"></div>
                            <div className="plane">✈️</div>
                          </div>
                          <div className="stops">Directo</div>
                        </div>

                        <div className="route-segment">
                          <div className="time">{llegadaIda.time}</div>
                          <div className="place">
                            <div className="city">{flight.destino}</div>
                            <div className="airport">{flight.destino}</div>
                          </div>
                          {/* 🔥 MOSTRAR FECHA CORRECTA DE LLEGADA */}
                          <div className="date">{fechaLlegadaCorta}</div>
                        </div>
                      </div>

                      {/* VUELO DE VUELTA - SOLO SI HAY VUELO REAL DE RETORNO */}
                      {isRoundTrip && hasReturnFlight && (
                        <div className="return-flight-section">
                          <div className="section-divider">
                            <span>🔄 Vuelo de Retorno</span>
                          </div>

                          <div className="flight-route return-route">
                            <div className="route-segment">
                              <div className="time">{horaSalidaRetorno}</div>
                              <div className="place">
                                <div className="city">
                                  {flight.returnFlight.origen}
                                </div>
                                <div className="airport">
                                  {flight.returnFlight.origen}
                                </div>
                              </div>
                              <div className="date">{fechaRetornoCorta}</div>
                            </div>

                            <div className="route-middle">
                              <div className="duration">{duracionRetorno}</div>
                              <div className="route-line">
                                <div className="line"></div>
                                <div className="plane">↩️</div>
                              </div>
                              <div className="stops">Directo</div>
                            </div>

                            <div className="route-segment">
                              <div className="time">{llegadaRetorno.time}</div>
                              <div className="place">
                                <div className="city">
                                  {flight.returnFlight.destino}
                                </div>
                                <div className="airport">
                                  {flight.returnFlight.destino}
                                </div>
                              </div>
                              {/* 🔥 MOSTRAR FECHA CORRECTA DE LLEGADA */}
                              <div className="date">
                                {fechaLlegadaRetornoCorta}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flight-features">
                        <div className="feature">
                          <span>🎒</span>
                          <span>Equipaje</span>
                        </div>
                        <div className="feature">
                          <span>💺</span>
                          <span>Asiento</span>
                        </div>
                        {isRoundTrip && hasReturnFlight && (
                          <div className="feature">
                            <span>🔄</span>
                            <span>Incluye vuelo de retorno</span>
                          </div>
                        )}
                        {isInternational && <div className="feature"></div>}
                      </div>

                      <div className="flight-actions">
                        <button
                          className="select-flight-btn"
                          onClick={() => handleSelectFlight(flight)}
                        >
                          ✈️{" "}
                          {isRoundTrip && hasReturnFlight
                            ? "Seleccionar Ida y Vuelta"
                            : "Seleccionar Vuelo"}
                        </button>

                        {/* 🔥 MOSTRAR BOTÓN CARRITO SOLO SI PUEDE USARLO */}
                        {canUseCart() && (
                          <button
                            className="add-to-cart-btn"
                            onClick={() => handleAddToCart(flight)}
                          >
                            🛒 Agregar al Carrito
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-flights-enhanced">
                  <div className="no-flights-icon">✈️</div>
                  <h3>No hay vuelos disponibles</h3>
                  <p>No encontramos vuelos que coincidan con tu búsqueda.</p>
                  <button className="back-btn" onClick={handleNewSearch}>
                    Intentar nueva búsqueda
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 🔹 FOOTER */}
      <footer className="footer">
        <p>© 2025 VivaSky Airlines - Todos los derechos reservados</p>
      </footer>
    </div>
  );
}

export default SearchFlights;
