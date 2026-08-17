"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SearchableSelect } from "@/components/searchable-select";
import { buenaventuraNeighborhoods, buenaventuraRuralAreas, departments, municipalitiesForDepartment } from "@/data/locations";

type ApplicantMode = "self" | "leader" | null;

const needs = ["Mercado o alimentos", "Agua potable", "Medicamentos", "Ropa", "Elementos de aseo", "Otro"];

export default function PublicRequestPage() {
  const [mode, setMode] = useState<ApplicantMode>(null);
  const [step, setStep] = useState(1);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [department, setDepartment] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [areaType, setAreaType] = useState<"urban" | "rural" | "">("");
  const [neighborhood, setNeighborhood] = useState("");
  const [ruralDistrict, setRuralDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [preferredContact, setPreferredContact] = useState("llamada");
  const [details, setDetails] = useState("");
  const [reference, setReference] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [trackingCode, setTrackingCode] = useState("AYU-2026-0034");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const municipalityOptions = municipalitiesForDepartment(department);
  const selectedRuralDistrict = buenaventuraRuralAreas.find((item) => item.district === ruralDistrict);
  const isBuenaventura = municipality === "76109";
  const departmentOptions = departments.map((item) => ({ value: item.code, label: item.name }));
  const municipalitySelectOptions = municipalityOptions.map((item) => ({ value: item.code, label: `${item.name}${item.type !== "Municipio" ? ` (${item.type})` : ""}` }));
  const neighborhoodOptions = buenaventuraNeighborhoods.map((item) => ({ value: item.name, label: `Comuna ${item.commune} · ${item.name}`, group: `Localidad ${item.locality}` }));
  const ruralDistrictOptions = buenaventuraRuralAreas.map((item) => ({ value: item.district, label: item.district }));
  const villageOptions = selectedRuralDistrict?.villages.map((item) => ({ value: item, label: item })) ?? [];

  const toggleNeed = (need: string) => {
    setSelectedNeeds((current) => current.includes(need) ? current.filter((item) => item !== need) : [...current, need]);
  };

  const continueForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStep((current) => Math.min(3, current + 1));
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const locationName = isBuenaventura && areaType === "urban" ? neighborhood : isBuenaventura ? village : manualLocation;
    const parentLocationName = isBuenaventura && areaType === "rural" ? ruralDistrict : undefined;
    setSubmitting(true);
    setSubmissionError("");
    try {
      const response = await fetch("/api/public-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicantName, phone, beneficiaryName: mode === "leader" ? beneficiaryName : applicantName, preferredContact, needs: selectedNeeds, details, municipalityCode: municipality, areaType, locationName, parentLocationName, reference }) });
      const result = await response.json() as { code?: string; error?: string };
      if (!response.ok || !result.code) throw new Error(result.error || "No pudimos guardar la solicitud.");
      setTrackingCode(result.code);
      setSubmitted(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "No pudimos guardar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <main className="public-page"><PublicHeader /><section className="success-page"><div className="success-icon">✓</div><p className="public-eyebrow">Solicitud recibida</p><h1>Gracias por contarnos.</h1><p>Tu solicitud ya llegó a la Red Comunitaria. Una persona del equipo revisará la información y se comunicará contigo.</p><div className="tracking-card"><span>Tu número de seguimiento</span><strong>{trackingCode}</strong><small>Guárdalo o toma una foto de esta pantalla.</small></div><button className="public-primary" onClick={() => { setSubmitted(false); setStep(1); setMode(null); setSelectedNeeds([]); setApplicantName(""); setPhone(""); setBeneficiaryName(""); setDetails(""); setReference(""); }}>Registrar otra solicitud <span>→</span></button><p className="success-help">¿Tienes una urgencia? Llámanos al <a href="tel:+576022412345">(602) 241 2345</a>.</p></section></main>;
  }

  return <main className="public-page">
    <PublicHeader />
    <section className="public-hero">
      <div className="sun-shape" aria-hidden="true" />
      <p className="public-eyebrow">Red Comunitaria · Buenaventura</p>
      <h1>Estamos para <em>ayudarnos</em>.</h1>
      <p>Cuéntanos qué necesitas. Es fácil, toma pocos minutos y no necesitas crear una cuenta.</p>
      <div className="callout"><span>i</span><p>Si necesitas ayuda para llenar este formulario, puedes pedir apoyo a una persona de confianza o llamarnos.</p></div>
    </section>

    {!mode ? <section className="public-choice" aria-labelledby="choice-title"><div className="choice-heading"><p className="public-eyebrow">Paso 1 de 1</p><h2 id="choice-title">¿Para quién solicitas ayuda?</h2><p>Elige la opción que más se parezca a tu caso.</p></div><div className="choice-grid"><button className="choice-card" onClick={() => setMode("self")}><span className="choice-art self-art">♡</span><div><strong>Para mí o mi familia</strong><p>Necesito apoyo para mi hogar.</p></div><span className="choice-arrow">→</span></button><button className="choice-card" onClick={() => setMode("leader")}><span className="choice-art leader-art">♧</span><div><strong>Soy líder o lideresa</strong><p>Quiero solicitar apoyo para otra persona, familia o comunidad.</p></div><span className="choice-arrow">→</span></button></div></section> : <section className="public-form-wrap"><div className="form-top"><button className="back-button" onClick={() => step === 1 ? setMode(null) : setStep((current) => current - 1)}>← <span>Volver</span></button><div className="progress"><span className={step >= 1 ? "done" : ""} /><span className={step >= 2 ? "done" : ""} /><span className={step >= 3 ? "done" : ""} /></div><small>Paso {step} de 3</small></div>
      {step === 1 && <form className="public-form" onSubmit={continueForm}><p className="public-eyebrow">Conocerte un poco</p><h2>{mode === "leader" ? "Tus datos como líder o lideresa" : "¿Cómo te llamas?"}</h2><p className="form-intro">Usaremos estos datos solo para comunicarnos contigo sobre esta solicitud.</p><label className="form-label">{mode === "leader" ? "Tu nombre completo" : "Nombre de la persona que solicita"}<b> *</b><input value={applicantName} onChange={(event) => setApplicantName(event.target.value)} placeholder="Escribe tu nombre" required /></label><label className="form-label">Número de celular<b> *</b><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Ej. 300 123 4567" type="tel" required /></label><SearchableSelect label="¿Cómo prefieres que te contactemos?" placeholder="Selecciona una opción" value={preferredContact} onChange={setPreferredContact} options={[{ value: "llamada", label: "Por llamada" }, { value: "whatsapp", label: "Por WhatsApp" }, { value: "mensaje", label: "Por mensaje de texto" }]} />{mode === "leader" && <label className="form-label">Nombre de la persona o familia que necesita ayuda<b> *</b><input value={beneficiaryName} onChange={(event) => setBeneficiaryName(event.target.value)} placeholder="Ej. Familia Riascos" required /></label>}<FormContinue text="Continuar" /></form>}
      {step === 2 && <form className="public-form" onSubmit={continueForm}><p className="public-eyebrow">Cuéntanos qué ocurre</p><h2>¿Qué ayuda necesitan?</h2><p className="form-intro">Puedes escoger más de una opción.</p><div className="need-options">{needs.map((need) => <button type="button" key={need} className={selectedNeeds.includes(need) ? "selected" : ""} onClick={() => toggleNeed(need)}><span>{selectedNeeds.includes(need) ? "✓" : "+"}</span>{need}</button>)}</div><label className="form-label">Cuéntanos un poco más <small>Opcional</small><textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Por ejemplo: somos cinco personas, tenemos dos niños y no tenemos agua desde ayer." rows={4} /></label><FormContinue text="Continuar" disabled={selectedNeeds.length === 0} /></form>}
      {step === 3 && <form className="public-form" onSubmit={submitRequest}>
        <p className="public-eyebrow">Ubicación</p>
        <h2>¿Dónde se encuentra la ayuda?</h2>
        <p className="form-intro">Escoge primero el departamento y el municipio. Después te mostraremos las opciones de tu zona.</p>
        <SearchableSelect label="Departamento" required placeholder="Busca tu departamento" value={department} options={departmentOptions} onChange={(value) => { setDepartment(value); setMunicipality(""); setAreaType(""); setNeighborhood(""); setRuralDistrict(""); setVillage(""); }} />
        <SearchableSelect label="Municipio" required placeholder={department ? "Busca tu municipio" : "Primero selecciona un departamento"} value={municipality} options={municipalitySelectOptions} disabled={!department} onChange={(value) => { setMunicipality(value); setAreaType(""); setNeighborhood(""); setRuralDistrict(""); setVillage(""); }} emptyMessage="No encontramos un municipio con ese nombre." />
        <fieldset className="area-choice" disabled={!municipality}><legend>¿La ayuda se necesita en zona urbana o rural? <b>*</b></legend><label className={areaType === "urban" ? "selected" : ""}><input type="radio" name="area" value="urban" checked={areaType === "urban"} onChange={() => { setAreaType("urban"); setRuralDistrict(""); setVillage(""); }} /> <span>⌂</span><strong>Urbana</strong><small>En la ciudad o cabecera municipal</small></label><label className={areaType === "rural" ? "selected" : ""}><input type="radio" name="area" value="rural" checked={areaType === "rural"} onChange={() => { setAreaType("rural"); setNeighborhood(""); }} /> <span>⌇</span><strong>Rural</strong><small>En vereda, corregimiento o zona rural</small></label></fieldset>
        {isBuenaventura && areaType === "urban" && <SearchableSelect label="Barrio de Buenaventura" required placeholder="Busca tu barrio" value={neighborhood} options={neighborhoodOptions} onChange={setNeighborhood} description="Barrios organizados por localidad y comuna." emptyMessage="No encontramos ese barrio." />}
        {isBuenaventura && areaType === "rural" && <><SearchableSelect label="Corregimiento" required placeholder="Busca el corregimiento" value={ruralDistrict} options={ruralDistrictOptions} onChange={(value) => { setRuralDistrict(value); setVillage(""); }} /><SearchableSelect label="Vereda" required placeholder={ruralDistrict ? "Busca la vereda" : "Primero selecciona el corregimiento"} value={village} options={villageOptions} disabled={!ruralDistrict} onChange={setVillage} description="Veredas organizadas por corregimiento." emptyMessage="No encontramos esa vereda." /></>}
        {!isBuenaventura && areaType && <label className="form-label">{areaType === "urban" ? "Barrio o sector" : "Vereda, corregimiento o sector"}<b> *</b><input value={manualLocation} onChange={(event) => setManualLocation(event.target.value)} placeholder={areaType === "urban" ? "Ej. Centro" : "Ej. Vereda El Porvenir"} required /></label>}
        <label className="form-label">Dirección o referencia <small>Opcional</small><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ej. Cerca a la cancha, casa azul" /></label>{submissionError && <p className="form-error" role="alert">{submissionError}</p>}<div className="consent"><span>✓</span><p>La información será usada únicamente para gestionar esta solicitud de ayuda.</p></div><button className="public-primary" type="submit" disabled={submitting || !department || !municipality || !areaType || !isBuenaventura && !manualLocation || (isBuenaventura && areaType === "urban" && !neighborhood) || (isBuenaventura && areaType === "rural" && !village)}>{submitting ? "Enviando…" : "Enviar solicitud"} <span>→</span></button></form>}</section>}
    <section className="public-safety"><span>⌾</span><p><strong>Tu información está protegida.</strong> Nunca pediremos claves bancarias ni dinero para tramitar una ayuda.</p></section>
    <footer className="public-footer"><span className="public-brand"><b>m</b> Manos <span>Cerca</span></span><p>Una red que se cuida y se acompaña.</p><Link href="/">Ingreso para el equipo →</Link></footer>
  </main>;
}

function PublicHeader() {
  return <header className="public-header"><Link href="/solicitar-ayuda" className="public-brand"><b>m</b> Manos <span>Cerca</span></Link><a className="header-help" href="tel:+576022412345"><span>?</span> ¿Necesitas ayuda?</a></header>;
}

function FormContinue({ text, disabled = false }: { text: string; disabled?: boolean }) {
  return <button className="public-primary" type="submit" disabled={disabled}>{text} <span>→</span></button>;
}
