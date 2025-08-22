// src/pages/Dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "react-apexcharts";
import { BiBarChart, BiPieChart } from "react-icons/bi";
import { FiAlertTriangle } from "react-icons/fi";
import { LuRotateCw, LuTrendingUp } from "react-icons/lu";
import { httpGet } from "../api/http";
import s from "./Dashboard.module.scss";

export default function Dashboard({ dark = false }) {
  const rootRef = useRef(null);

  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  // CSS tokenlarni o‘qib ApexCharts’ga beramiz
  const [apx, setApx] = useState({
    fg: "#0f172a",
    muted: "#6b7280",
    border: "#e5e7eb",
    card: "#ffffff",
  });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const read = (v, fb) => cs.getPropertyValue(v)?.trim() || fb;
    setApx({
      fg: read("--db-fg", dark ? "#e6eef9" : "#0f172a"),
      muted: read("--db-muted", dark ? "#94a3b8" : "#6b7280"),
      border: read("--db-border", dark ? "#223046" : "#e5e7eb"),
      card: read("--db-card", dark ? "#0f172a" : "#ffffff"),
    });
  }, [dark]);

  // Type filter (CSV)
  const [selectedTypes, setSelectedTypes] = useState(() => new Set());
  const typesCsv = useMemo(
    () =>
      selectedTypes.size ? Array.from(selectedTypes).join(",") : undefined,
    [selectedTypes]
  );

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await httpGet("/api/stats/overview", {
        year,
        ...(typesCsv ? { types: typesCsv } : {}),
      });
      setData(res);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Statistikani yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, typesCsv]);

  // Oxirgi 5 yil
  const years = useMemo(() => {
    const arr = [];
    for (let y = thisYear; y >= thisYear - 4; y--) arr.push(y);
    return arr;
  }, [thisYear]);

  // Aggs
  const total = data?.total ?? 0;
  const active = data?.active ?? 0;
  const inactive = Math.max(0, total - active);
  const typeAgg = data?.types ?? [];
  const distinctTypes = typeAgg.length;

  // Donut
  const donutSeries = typeAgg.map((t) => t.count);
  const donutLabels = typeAgg.map((t) => t.type);

  // Area (oylar)
  const monthsLabels = [
    "Yan",
    "Fev",
    "Mar",
    "Apr",
    "May",
    "Iyun",
    "Iyul",
    "Avg",
    "Sen",
    "Okt",
    "Noy",
    "Dek",
  ];
  const monthlySeries = [
    {
      name: "Yaratilgan",
      data: data?.monthly?.map((m) => m.count) ?? Array(12).fill(0),
    },
  ];

  const topOrgs = data?.orgs ?? [];

  // Chips
  const toggleType = (t) =>
    setSelectedTypes((s0) => {
      const s = new Set(s0);
      if (s.has(t)) s.delete(t);
      else s.add(t);
      return s;
    });
  const clearTypes = () => setSelectedTypes(new Set());

  // ApexCharts theming (dark/light + CSS tokenlar)
  const themeKey = dark ? "dark" : "light";
  const xLabelColors = Array(monthsLabels.length).fill(apx.muted);

  const baseAreaOptions = {
    theme: { mode: themeKey },
    chart: {
      background: "transparent",
      toolbar: { show: false },
      foreColor: apx.fg,
    },
    xaxis: {
      categories: monthsLabels,
      axisBorder: { show: true, color: apx.border },
      axisTicks: { show: true, color: apx.border },
      labels: { style: { colors: xLabelColors } },
    },
    yaxis: {
      labels: { style: { colors: [apx.muted] } },
    },
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 0, strokeColors: apx.card },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
    },
    grid: { strokeDashArray: 4, borderColor: apx.border },
    tooltip: { theme: themeKey, y: { formatter: (v) => `${v} ta` } },
    dataLabels: { enabled: false },
    legend: { labels: { colors: apx.muted } },
  };

  const baseDonutOptions = {
    theme: { mode: themeKey },
    chart: { background: "transparent", foreColor: apx.fg },
    labels: donutLabels,
    legend: { position: "bottom", labels: { colors: apx.muted } },
    dataLabels: { enabled: true },
    tooltip: { theme: themeKey, y: { formatter: (v) => `${v}` } },
    stroke: { colors: [apx.card] }, // bo‘lak chegaralari karta foni rangida
  };

  // key ga ranglarni ham qo‘shamiz — to‘liq remount kafolatlanadi
  const areaKey = `area-${themeKey}-${apx.fg}-${apx.border}-${year}-${
    typesCsv || "all"
  }`;
  const donutKey = `donut-${themeKey}-${apx.fg}-${apx.border}-${year}-${
    typesCsv || "all"
  }`;

  return (
    <div ref={rootRef} className={s.root} data-theme={dark ? "dark" : "light"}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.titleWrap}>
          <h1 className={s.title}>Dashboard</h1>
          <span className={s.sub}>
            {loading ? "Yuklanmoqda…" : `${total} ta obyekt`}
          </span>
        </div>

        {/* Toolbar */}
        <div className={s.toolbar}>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={s.select}
            aria-label="Yil"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className={s.chips}>
            {donutLabels.map((t) => {
              const isOn = selectedTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`${s.chip} ${isOn ? s.chipActive : ""}`}
                  aria-pressed={isOn}
                  title={t}
                >
                  {t}
                </button>
              );
            })}
            {selectedTypes.size > 0 && (
              <button onClick={clearTypes} className={`${s.btn} ${s.btnSoft}`}>
                Tozalash
              </button>
            )}
          </div>

          <button
            onClick={load}
            className={s.btn}
            title="Yangilash"
            disabled={loading}
          >
            <LuRotateCw size={16} />
          </button>
        </div>
      </div>

      {err && <div className={s.error}>{err}</div>}

      {/* KPI’lar */}
      <div className={s.kpiGrid}>
        <Kpi
          icon={<BiBarChart size={18} />}
          label="Jami obyektlar"
          value={total}
        />
        <Kpi
          icon={<LuTrendingUp size={18} />}
          label="Faol"
          value={active}
          tone="good"
        />
        <Kpi
          icon={<FiAlertTriangle size={18} />}
          label="Faol emas"
          value={inactive}
          tone="warn"
        />
        <Kpi
          icon={<BiPieChart size={18} />}
          label="Turlar"
          value={distinctTypes}
        />
      </div>

      {/* CHART grid */}
      <div className={s.grid}>
        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Oylik qo‘shilish ({year})</span>
          </div>
          <Chart
            key={areaKey}
            type="area"
            height={320}
            series={monthlySeries}
            options={baseAreaOptions}
          />
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Turlar bo‘yicha taqsimot</span>
          </div>
          <Chart
            key={donutKey}
            type="donut"
            height={320}
            series={donutSeries}
            options={baseDonutOptions}
          />
        </div>
      </div>

      {/* Top orgs */}
      <div className={s.card} style={{ marginTop: 12 }}>
        <div className={s.cardHead}>
          <span>Tashkilotlar kesimida (TOP)</span>
          {!loading && <span className={s.sub}>{topOrgs.length} ta</span>}
        </div>

        {loading ? (
          <div className={s.loading}>Yuklanmoqda…</div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tashkilot</th>
                  <th className={s.right}>Obyektlar</th>
                </tr>
              </thead>
              <tbody>
                {(topOrgs ?? []).map((o, i) => (
                  <tr key={`${o.orgId}-${i}`}>
                    <td>{i + 1}</td>
                    <td>{o.orgName}</td>
                    <td className={s.right}>{o.count}</td>
                  </tr>
                ))}
                {(!topOrgs || topOrgs.length === 0) && (
                  <tr>
                    <td colSpan={3}>Ma’lumot yo‘q</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }) {
  const toneClass =
    tone === "good"
      ? "good"
      : tone === "warn"
      ? "warn"
      : tone === "danger"
      ? "danger"
      : "";
  return (
    <div className={`${s.kpi} ${toneClass ? s[toneClass] : ""}`}>
      <div className={s.kpiIcon}>{icon}</div>
      <div className={s.kpiMeta}>
        <div className={s.kpiLabel}>{label}</div>
        <div className={s.kpiValue}>
          {new Intl.NumberFormat().format(value ?? 0)}
        </div>
      </div>
    </div>
  );
}
