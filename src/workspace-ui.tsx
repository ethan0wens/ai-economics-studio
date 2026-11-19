import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Boxes, ChartNoAxesCombined, Cloud, FileText, GitFork, House, Menu, ShieldCheck, Workflow, X } from 'lucide-react';
import type { Environment } from './domain';
import { destinations, routeHref, type Destination } from './navigation';

const links = [
  ['home', House], ['builder', Boxes], ['costs', ChartNoAxesCombined], ['reports', FileText], ['documentation', BookOpen],
] as const;

export function StudioNavigation({ page }: { page: Destination }) {
  const [openFor, setOpenFor] = useState<Destination>();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const open = openFor === page;
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  function close(restore: boolean) {
    if (dialog.current?.open) dialog.current.close();
    setOpenFor(undefined);
    if (restore) trigger.current?.focus();
  }
  const nav = () => <nav aria-label="Studio navigation">
    {links.map(([id, Icon]) => <a key={id} href={routeHref(id)} aria-current={page === id ? 'page' : undefined} onClick={() => close(false)}>
      <Icon size={19} aria-hidden="true" />{destinations[id]}</a>)}
    <a className="reference-nav" href={routeHref('catalogue')} aria-current={page === 'catalogue' ? 'page' : undefined} onClick={() => close(false)}>
      <Cloud size={19} aria-hidden="true" />Pricing Catalogue</a>
  </nav>;
  const brand = () => <a className="brand" href={routeHref('home')} onClick={() => close(false)}><span className="brand-icon"><Workflow size={22} aria-hidden="true" /></span>
    <span>AI Economics<span className="brand-studio">Studio</span></span></a>;
  return <>
    <aside className="sidebar"><div>{brand()}</div>{nav()}
      <div className="rail-footer"><ShieldCheck size={17} aria-hidden="true" /><div><strong>Private by design</strong><small>Work stays in this tab.</small></div></div>
    </aside>
    <div className="mobile-studio">
      <button ref={trigger} className="icon-button" aria-label="Toggle navigation" aria-expanded={open} aria-controls="mobile-navigation"
        onClick={() => open ? close(true) : setOpenFor(page)}><Menu size={21} aria-hidden="true" /></button>
      {brand()}
    </div>
    <dialog ref={dialog} id="mobile-navigation" aria-label="Studio menu" className="mobile-navigation"
      onCancel={event => { event.preventDefault(); close(true); }}>
      <div className="section-heading">{brand()}<button className="icon-button" aria-label="Close navigation" onClick={() => close(true)}><X size={20} aria-hidden="true" /></button></div>
      {nav()}
    </dialog>
  </>;
}

export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const dialog = ref.current!;
    dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="section-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={19} aria-hidden="true" /></button></div>
    {children}
  </dialog>;
}

export function Home({ env, status, create, resume, importFile, error }: {
  env?: Environment; status: string; create: (name: string) => void; resume: () => void; importFile: () => void; error: string;
}) {
  const [showNew, setShowNew] = useState(false);
  const [nameError, setNameError] = useState('');
  const name = useRef<HTMLInputElement>(null);
  const entering = !env || showNew;
  return <div className="welcome">
    <div className="welcome-intro">
      <h1 tabIndex={-1}>Plan and estimate a Microsoft AI environment</h1>
      <p>Model agents, usage and supporting services. See what you can price and share an estimate with its assumptions.</p>
    </div>
    <div className="welcome-entry">
      {entering ? <form onSubmit={event => {
        event.preventDefault();
        const value = name.current!.value.trim();
        if (!value) { setNameError('Enter an environment name.'); name.current?.focus(); return; }
        setNameError(''); setShowNew(false); create(value);
      }}>
        <label htmlFor="new-environment-name">Environment name</label>
        <input ref={name} id="new-environment-name" placeholder="e.g. Internal support assistant" maxLength={300}
          aria-describedby={nameError ? 'name-error' : undefined} aria-invalid={!!nameError}
          onChange={() => { if (nameError) setNameError(''); }} />
        {nameError && <p id="name-error" role="alert" className="field-missing">{nameError}</p>}
        <div className="actions"><button className="button primary">Create Environment <ArrowRight size={17} aria-hidden="true" /></button>
          <button className="button" type="button" onClick={importFile}>Import Existing Environment</button>
          {env && <button className="link-button" type="button" onClick={() => setShowNew(false)}>Cancel</button>}</div>
      </form> : <div>
        <h2>{env.name}</h2><p className="muted">{status}</p>
        <div className="actions"><button className="button primary" onClick={resume}>Resume environment <ArrowRight size={17} aria-hidden="true" /></button>
          <button className="button" onClick={() => { setShowNew(true); requestAnimationFrame(() => name.current?.focus()); }}>Start new</button>
          <button className="button" onClick={importFile}>Import Existing Environment</button></div>
      </div>}
      {error && <p className="notice error" role="alert">{error}</p>}
    </div>
    <ul className="welcome-capabilities">
      <li><GitFork size={20} aria-hidden="true" /><div><strong>Model your setup</strong><p>Plan with Foundry, Copilot Studio or both.</p></div></li>
      <li><ChartNoAxesCombined size={20} aria-hidden="true" /><div><strong>Understand the costs</strong><p>See known spend and what needs evidence.</p></div></li>
      <li><ArrowDownToLine size={20} aria-hidden="true" /><div><strong>Share your estimate</strong><p>Download a PDF or save editable JSON.</p></div></li>
    </ul>
    <div className="welcome-examples"><div><h2>Example environments</h2><p>Explore a working estimate with illustrative inputs.</p></div>
      <a className="button" href={routeHref('examples')}>Browse examples <ArrowRight size={16} aria-hidden="true" /></a></div>
    <p className="privacy-copy">Your work stays in this browser tab. Download JSON to reopen it later. <a href={routeHref('documentation', 'privacy')}>Privacy and storage</a></p>
  </div>;
}
