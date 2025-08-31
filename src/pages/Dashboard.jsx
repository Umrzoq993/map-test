import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "react-apexcharts";
import { BiBarChart, BiPieChart } from "react-icons/bi";
import { FiAlertTriangle } from "react-icons/fi";
import { LuRotateCw, LuTrendingUp } from "react-icons/lu";
import { httpGet } from "../api/http";
import s from "./Dashboard.module.scss";

const EXPORT_ENABLED = false;
const MONTHS = [
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

// ✅ To'liq o'zbekcha mapping (11 tur)
const mapType = (t) => {
  const M = {
    GREENHOUSE: "Issiqxona",
    POULTRY_MEAT: "Tovuqxona (go‘sht)",
    POULTRY_EGG: "Tovuqxona (tuxum)",
    TURKEY: "Kurkaxona",
    COWSHED: "Molxona",
    SHEEPFOLD: "Qo‘yxona",
    WORKSHOP_SAUSAGE: "Sex (kolbasa)",
    WORKSHOP_COOKIE: "Sex (pechenye)",
    AUX_LAND: "Yordamchi yer",
    BORDER_LAND: "Chegara oldi yer",
    FISHPOND: "Baliqchilik ko‘li",
  };
  return (
    M[t] ??
    (t || "")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
  );
};

const fmtNum = (v) => new Intl.NumberFormat("uz-UZ").format(v ?? 0);
const fmtMoney = (v) =>
  `${new Intl.NumberFormat("uz-UZ").format(Math.round(v ?? 0))} so‘m`;
const fmtPct = (v) => (v == null ? "—" : `${v.toFixed(1)}%`);

export default function Dashboard({ dark = false }) {
  const rootRef = useRef(null);

  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [range, setRange] = useState("year");
  const [quarter, setQuarter] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

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

  const [selectedTypes, setSelectedTypes] = useState(() => new Set());
  const typesCsv = useMemo(
    () =>
      selectedTypes.size ? Array.from(selectedTypes).join(",") : undefined,
    [selectedTypes]
  );

  const buildParams = () => {
    const p = { year, range };
    if (typesCsv) p.types = typesCsv;
    if (range === "quarter") p.quarter = quarter;
    if (range === "custom" && from && to) {
      p.from = `${from}-01`;
      const [yy, mm] = to.split("-").map(Number);
      const lastDay = new Date(yy, mm, 0).getDate();
      p.to = `${to}-${String(lastDay).padStart(2, "0")}`;
    }
    return p;
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await httpGet("/stats/overview", buildParams());
      setData(res);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Statistikani yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [year, range, quarter, typesCsv, from, to]);

  const years = useMemo(
    () => Array.from({ length: 6 }, (_, i) => thisYear - i),
    [thisYear]
  );

  const total = data?.total ?? 0;
  const active = data?.active ?? 0;
  const inactive = Math.max(0, total - active);
  const typeAgg = data?.types ?? [];
  const distinctTypes = typeAgg.length;

  const rawTypes = typeAgg.map((t) => t.type);
  // Barcha turlar ro'yxati (doimiy ko'rinsin). Agar backend yangi qo'shsa, shu yerga qo'shish kifoya.
  const ALL_TYPES = [
    "GREENHOUSE",
    "POULTRY_MEAT",
    "POULTRY_EGG",
    "TURKEY",
    "COWSHED",
    "SHEEPFOLD",
    "WORKSHOP_SAUSAGE",
    "WORKSHOP_COOKIE",
    "AUX_LAND",
    "BORDER_LAND",
    "FISHPOND",
  ];
  const donutSeries = typeAgg.map((t) => t.count);
  const donutLabelsLocalized = rawTypes.map(mapType);

  const toggleType = (enumVal) =>
    setSelectedTypes((s0) => {
      const s = new Set(s0);
      s.has(enumVal) ? s.delete(enumVal) : s.add(enumVal);
      return s;
    });
  const clearTypes = () => setSelectedTypes(new Set());

  const monthlyThis = (data?.monthly ?? Array(12).fill({ count: 0 })).map(
    (m) => m.count
  );
  const monthlyPrev = (data?.prevMonthly ?? Array(12).fill({ count: 0 })).map(
    (m) => m.count
  );

  const revThis = (data?.revenueMonthly ?? Array(12).fill({ amount: 0 })).map(
    (m) => m.amount
  );
  const revPrev = (
    data?.revenuePrevMonthly ?? Array(12).fill({ amount: 0 })
  ).map((m) => m.amount);
  const profThis = (data?.profitMonthly ?? Array(12).fill({ amount: 0 })).map(
    (m) => m.amount
  );
  const profPrev = (
    data?.profitPrevMonthly ?? Array(12).fill({ amount: 0 })
  ).map((m) => m.amount);

  const typeKpis = data?.typeKpis ?? [];
  const typesCatsLocalized = typeKpis.map((t) => mapType(t.type));
  const typeRevenue = typeKpis.map((t) => t.revenue ?? 0);
  const typeProfit = typeKpis.map((t) => t.profit ?? 0);
  const typeCapacity = typeKpis.map((t) => t.capacity ?? 0);
  const typeCurrent = typeKpis.map((t) => t.current ?? 0);
  const typeUtilPct = typeKpis.map((t) => t.utilPct ?? 0);

  const topOrg = data?.topOrgRevenue ?? [];

  const yoyNewPct = data?.yoyNewPct ?? null;
  const revenueYtd = data?.revenueYtd ?? 0;
  const yoyRevenuePct = data?.yoyRevenuePct ?? null;
  const profitYtd = data?.profitYtd ?? 0;
  const yoyProfitPct = data?.yoyProfitPct ?? null;
  const capacityUtilPct = data?.capacityUtilPct ?? null;
  const productivity = data?.productivityKgPerM2 ?? null;

  const themeKey = dark ? "dark" : "light";
  const baseArea = {
    theme: { mode: themeKey },
    chart: {
      background: "transparent",
      toolbar: { show: false },
      foreColor: apx.fg,
    },
    xaxis: {
      categories: MONTHS,
      axisBorder: { show: true, color: apx.border },
      axisTicks: { show: true, color: apx.border },
      labels: { style: { colors: MONTHS.map(() => apx.muted) } },
    },
    yaxis: { labels: { style: { colors: [apx.muted] } } },
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 0, strokeColors: apx.card },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
    },
    grid: { strokeDashArray: 4, borderColor: apx.border },
    tooltip: { theme: themeKey },
    dataLabels: { enabled: false },
    legend: { position: "top", labels: { colors: apx.muted } },
    noData: { text: "Ma’lumot yo‘q" },
  };
  const baseDonut = {
    theme: { mode: themeKey },
    chart: { background: "transparent", foreColor: apx.fg },
    labels: donutLabelsLocalized,
    legend: { position: "bottom", labels: { colors: apx.muted } },
    dataLabels: { enabled: true },
    stroke: { colors: [apx.card] },
    noData: { text: "Ma’lumot yo‘q" },
  };
  const baseBar = {
    theme: { mode: themeKey },
    chart: {
      background: "transparent",
      foreColor: apx.fg,
      stacked: false,
      toolbar: { show: false },
    },
    grid: { borderColor: apx.border },
    xaxis: {
      labels: { style: { colors: typesCatsLocalized.map(() => apx.muted) } },
      categories: typesCatsLocalized,
    },
    yaxis: { labels: { style: { colors: [apx.muted] } } },
    dataLabels: { enabled: false },
    legend: { position: "top", labels: { colors: apx.muted } },
    noData: { text: "Ma’lumot yo‘q" },
  };
  const baseStacked = {
    ...baseBar,
    chart: { ...baseBar.chart, stacked: true },
  };

  const yoyBadge = (pct) =>
    pct == null ? null : (
      <span className={`${s.badge} ${pct >= 0 ? s.badgeUp : s.badgeDown}`}>
        <LuTrendingUp size={14} /> {pct.toFixed(1)}%
      </span>
    );

  return (
    <div ref={rootRef} className={s.root} data-theme={dark ? "dark" : "light"}>
      <div className={s.header}>
        <div className={s.titleWrap}>
          <h1 className={s.title}>Boshqaruv paneli</h1>
          <span className={s.sub}>
            {loading ? "Yuklanmoqda…" : `${fmtNum(total)} ta obyekt`}
          </span>
        </div>

        <div className={s.toolbar}>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className={s.select}
            aria-label="Davr"
          >
            <option value="year">Yil</option>
            <option value="quarter">Chorak</option>
            <option value="custom">Maxsus davr</option>
          </select>

          {(range === "year" || range === "quarter") && (
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
          )}

          {range === "quarter" && (
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
              className={s.select}
              aria-label="Chorak"
            >
              <option value={1}>1-chorak</option>
              <option value={2}>2-chorak</option>
              <option value={3}>3-chorak</option>
              <option value={4}>4-chorak</option>
            </select>
          )}

          {range === "custom" && (
            <>
              <input
                type="month"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={s.select}
                aria-label="Boshlanish (oy)"
              />
              <input
                type="month"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={s.select}
                aria-label="Tugash (oy)"
              />
            </>
          )}

          <div className={s.chips}>
            {ALL_TYPES.map((enumVal) => {
              const on = selectedTypes.has(enumVal);
              const present = rawTypes.includes(enumVal);
              return (
                <button
                  key={enumVal}
                  onClick={() => (present ? toggleType(enumVal) : null)}
                  className={`${s.chip} ${on ? s.chipActive : ""} ${
                    !present ? s.chipDisabled : ""
                  }`}
                  aria-pressed={on}
                  title={mapType(enumVal)}
                  disabled={!present}
                >
                  {mapType(enumVal)}
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

          {EXPORT_ENABLED && (
            <button className={s.btn} title="CSVga eksport">
              CSV
            </button>
          )}
        </div>
      </div>

      {err && (
        <div className={s.error}>
          <FiAlertTriangle /> {err}
        </div>
      )}

      <div className={s.kpiGrid}>
        <Kpi
          icon={<BiBarChart size={18} />}
          label="Jami obyektlar"
          value={fmtNum(total)}
        />
        <Kpi
          icon={<LuTrendingUp size={18} />}
          label="Faol"
          value={fmtNum(active)}
          tone="good"
        />
        <Kpi
          icon={<FiAlertTriangle size={18} />}
          label="Faol emas"
          value={fmtNum(inactive)}
          tone="warn"
        />
        <Kpi
          icon={<BiPieChart size={18} />}
          label="Turlar"
          value={fmtNum(distinctTypes)}
        />
      </div>

      <div className={s.card}>
        <div className={s.cardHead}>
          <span>Yangi obyektlar — joriy yil boshidan hozirgacha</span>
          {yoyBadge(data?.yoyNewPct)}
        </div>
        <div
          className={s.kpiGrid}
          style={{ gridTemplateColumns: "repeat(2,1fr)" }}
        >
          <Kpi
            icon={<LuTrendingUp size={18} />}
            label={`${data?.year ?? year}`}
            value={fmtNum(data?.yearNewCount ?? 0)}
            tone="good"
          />
          <Kpi
            icon={<LuTrendingUp size={18} />}
            label={`${(data?.year ?? year) - 1}`}
            value={fmtNum(data?.prevYearNewCount ?? 0)}
          />
        </div>
      </div>

      <div className={s.kpiGrid} style={{ marginTop: 12 }}>
        <Kpi
          icon={<LuTrendingUp size={18} />}
          label="Tushum — joriy yil boshidan hozirgacha"
          value={fmtMoney(data?.revenueYtd ?? 0)}
          extra={yoyBadge(data?.yoyRevenuePct)}
        />
        <Kpi
          icon={<LuTrendingUp size={18} />}
          label="Sof foyda — joriy yil boshidan hozirgacha"
          value={fmtMoney(data?.profitYtd ?? 0)}
          extra={yoyBadge(data?.yoyProfitPct)}
        />
        <Kpi
          icon={<LuTrendingUp size={18} />}
          label="Sig‘imdan foydalanish"
          value={fmtPct(data?.capacityUtilPct ?? 0)}
        />
        <Kpi
          icon={<LuTrendingUp size={18} />}
          label="Hosildorlik"
          value={
            data?.productivityKgPerM2 == null
              ? "—"
              : `${data.productivityKgPerM2.toFixed(2)} kg/m²`
          }
        />
      </div>

      <div className={s.gridWide}>
        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Oylar bo‘yicha qo‘shilish</span>
          </div>
          <Chart
            type="area"
            height={300}
            series={[
              { name: `${data?.year ?? year} / Yangi`, data: monthlyThis },
              {
                name: `${(data?.year ?? year) - 1} / Yangi`,
                data: monthlyPrev,
              },
            ]}
            options={{
              ...baseArea,
              tooltip: {
                ...baseArea.tooltip,
                y: { formatter: (v) => `${v} ta` },
              },
            }}
          />
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Tushum oylar bo‘yicha</span>
          </div>
          <Chart
            type="area"
            height={300}
            series={[
              { name: `${data?.year ?? year} / Tushum`, data: revThis },
              { name: `${(data?.year ?? year) - 1} / Tushum`, data: revPrev },
            ]}
            options={{
              ...baseArea,
              tooltip: {
                ...baseArea.tooltip,
                y: { formatter: (v) => fmtMoney(v) },
              },
            }}
          />
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Sof foyda oylar bo‘yicha</span>
          </div>
          <Chart
            type="area"
            height={300}
            series={[
              { name: `${data?.year ?? year} / Sof foyda`, data: profThis },
              {
                name: `${(data?.year ?? year) - 1} / Sof foyda`,
                data: profPrev,
              },
            ]}
            options={{
              ...baseArea,
              tooltip: {
                ...baseArea.tooltip,
                y: { formatter: (v) => fmtMoney(v) },
              },
            }}
          />
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Sig‘im va joriy bandlik — turlar</span>
          </div>
          <Chart
            type="bar"
            height={320}
            series={[
              { name: "Sig‘im", data: typeCapacity },
              { name: "Joriy bandlik", data: typeCurrent },
            ]}
            options={baseStacked}
          />
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Tushum / Sof foyda — turlar</span>
          </div>
          <Chart
            type="bar"
            height={320}
            series={[
              { name: "Tushum", data: typeRevenue },
              { name: "Sof foyda", data: typeProfit },
            ]}
            options={baseBar}
          />
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Turlar bo‘yicha foydalanish (%)</span>
          </div>
          <Chart
            type="bar"
            height={320}
            series={[{ name: "Foydalanish %", data: typeUtilPct }]}
            options={{
              ...baseBar,
              yaxis: {
                ...baseBar.yaxis,
                labels: {
                  style: { colors: [apx.muted] },
                  formatter: (v) => `${v.toFixed(0)}%`,
                },
              },
              dataLabels: { enabled: false },
            }}
          />
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Tashkilotlar TOP-10 — Tushum</span>
          </div>
          <Chart
            type="bar"
            height={320}
            series={[
              {
                name: "Tushum",
                data: (topOrg ?? []).map((o) => o.revenue ?? 0),
              },
            ]}
            options={{
              ...baseBar,
              plotOptions: { bar: { horizontal: true } },
              xaxis: {
                ...baseBar.xaxis,
                categories: (topOrg ?? []).map((o) => o.orgName),
              },
              tooltip: {
                theme: themeKey,
                y: { formatter: (v) => fmtMoney(v) },
              },
            }}
          />
        </div>

        <div className={s.card}>
          <div className={s.cardHead}>
            <span>Turlar bo‘yicha taqsimot (soni)</span>
          </div>
          <Chart
            type="donut"
            height={320}
            series={donutSeries}
            options={baseDonut}
          />
        </div>
      </div>

      <div className={s.card} style={{ marginTop: 12 }}>
        <div className={s.cardHead}>
          <span>Tashkilotlar kesimida (soni)</span>
          {!loading && (
            <span className={s.sub}>{(data?.orgs ?? []).length} ta</span>
          )}
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
                {(data?.orgs ?? []).map((o, i) => (
                  <tr key={`${o.orgId}-${i}`}>
                    <td>{i + 1}</td>
                    <td>{o.orgName}</td>
                    <td className={s.right}>{fmtNum(o.count)}</td>
                  </tr>
                ))}
                {(!data?.orgs || data.orgs.length === 0) && (
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

function Kpi({ icon, label, value, tone, extra }) {
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
        <div className={s.kpiValue}>{value}</div>
        {extra ? <div className={s.kpiExtra}>{extra}</div> : null}
      </div>
    </div>
  );
}
