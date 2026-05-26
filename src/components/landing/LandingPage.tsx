"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

// ─── CSS ──────────────────────────────────────────────────────────────────────
// Injected as a <style> tag so it doesn't bleed into other app pages.
const STYLES = `
:root{
  --ll-cream: #f3eee2;
  --ll-cream-2: #e8e1cf;
  --ll-cream-3: #ddd4bd;
  --ll-ink: #1f3434;
  --ll-ink-2: #28403f;
  --ll-ink-3: #0f1d1d;
  --ll-brass: #b8956a;
  --ll-brass-2: #c9a878;
  --ll-sage: #5d756d;
  --ll-hairline: rgba(31,52,52,0.16);
  --ll-hairline-dark: rgba(243,238,226,0.16);
  --ll-serif: 'Instrument Serif','Times New Roman',serif;
  --ll-sans: 'Geist',ui-sans-serif,system-ui,-apple-system,sans-serif;
  --ll-mono: 'JetBrains Mono',ui-monospace,Menlo,monospace;
  --ll-ease-out: cubic-bezier(0.22,1,0.36,1);
  --ll-ease-in-out: cubic-bezier(0.65,0,0.35,1);
  --ll-t: 720ms;
}

.ll-root{
  position:fixed; inset:0; overflow:hidden;
  font-family: var(--ll-sans);
  font-weight:400;
  color: var(--ll-ink);
  background: var(--ll-cream);
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}

/* ── Stage ─────────────────────────────────────── */
.ll-stage{
  position:absolute; inset:0; overflow:hidden;
  background: var(--ll-cream);
}

.ll-slide{
  position:absolute; inset:0; will-change:transform,opacity,clip-path;
  display:flex; flex-direction:column;
  overflow:hidden;
}

/* Per-section themes */
.ll-theme-cream  { background:var(--ll-cream);   color:var(--ll-ink);   }
.ll-theme-cream-2{ background:var(--ll-cream-2); color:var(--ll-ink);   }
.ll-theme-ink    { background:var(--ll-ink);     color:var(--ll-cream); }
.ll-theme-ink-2  { background:var(--ll-ink-2);   color:var(--ll-cream); }

/* ── HERO theme ── */
.ll-theme-hero{
  background:var(--ll-ink);
  color:#f6f1e3;
  position:relative;
  isolation:isolate;
}
.ll-hero-bg{
  position:absolute; inset:0; z-index:0;
  overflow:hidden;
}
.ll-hero-bg img{
  position:absolute; inset:0;
  width:100%; height:100%;
  object-fit:cover; object-position:center;
  filter:saturate(0.92) brightness(0.86);
  transform:scale(1.06);
  transition:transform 12s linear;
}
.ll-slide[data-state="active"] .ll-hero-bg img{
  transform:scale(1.0);
}
.ll-hero-scrim{
  position:absolute; inset:0;
  pointer-events:none;
  background:
    linear-gradient(100deg,
      rgba(15,29,29,0.86) 0%,
      rgba(15,29,29,0.74) 28%,
      rgba(15,29,29,0.38) 60%,
      rgba(15,29,29,0.20) 100%),
    linear-gradient(180deg,
      rgba(15,29,29,0.10) 0%,
      transparent 30%,
      transparent 60%,
      rgba(15,29,29,0.78) 100%);
}

.ll-theme-hero > .ll-meta-strip,
.ll-theme-hero > .ll-hero-content{ position:relative; z-index:1; }

.ll-theme-hero .ll-meta-strip{
  color:rgba(246,241,227,0.78);
  opacity:1;
}
.ll-theme-hero .ll-eyebrow{ color:rgba(246,241,227,0.82); opacity:1; }

.ll-hero-content{
  display:grid;
  grid-template-rows:1fr auto;
  gap:clamp(20px,2.4vw,36px);
  min-height:0;
}
.ll-hero-text{
  align-self:end;
  display:flex; flex-direction:column; gap:16px;
  max-width:56vw;
}
.ll-hero-text .ll-h1{
  font-size:clamp(40px,min(6vw,8.4vh),96px);
  line-height:0.96;
  color:#fbf6e8;
  text-shadow:0 1px 24px rgba(0,0,0,0.35);
}
.ll-hero-text .ll-h1 em{ color:var(--ll-brass-2); font-style:italic; }
.ll-hero-text .ll-body{
  color:rgba(251,246,232,0.86);
  text-shadow:0 1px 18px rgba(0,0,0,0.28);
  font-size:clamp(13px,min(1vw,2.2vh),17px);
}

@media (max-height:720px){
  .ll-theme-hero.ll-section-pad{
    padding-top:clamp(40px,4vw,64px);
    padding-bottom:clamp(20px,2.5vw,40px);
  }
  .ll-theme-hero .ll-meta-strip{ margin-top:56px; font-size:10px; }
  .ll-hero-text{ gap:10px; }
  .ll-hero-text .ll-body{ display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  .ll-hero-content{ gap:14px; }
  .ll-hero-foot{ padding:12px clamp(16px,2vw,24px); gap:clamp(14px,2vw,32px); }
  .ll-hero-foot .ll-pt{ font-size:11.5px; line-height:1.4; }
}
@media (max-height:560px){
  .ll-theme-hero .ll-meta-strip{ display:none; }
  .ll-hero-text .ll-h1{ font-size:clamp(34px,7vh,56px); }
  .ll-hero-foot .ll-pt{ font-size:10.5px; }
}

.ll-theme-hero .ll-btn-brass{
  color:#1f3434;
  box-shadow:0 8px 24px -8px rgba(0,0,0,0.5);
}
.ll-theme-hero .ll-btn-ghost{
  color:#fbf6e8;
  border-color:rgba(251,246,232,0.65);
  background:rgba(15,29,29,0.22);
  backdrop-filter:blur(4px);
}
.ll-theme-hero .ll-btn-ghost:hover{ background:rgba(15,29,29,0.36); }

.ll-hero-foot{
  display:grid; grid-template-columns:repeat(3,1fr);
  gap:clamp(20px,3vw,48px);
  padding:18px clamp(20px,2.4vw,32px);
  border-radius:8px;
  background:rgba(15,29,29,0.55);
  backdrop-filter:blur(8px) saturate(140%);
  -webkit-backdrop-filter:blur(8px) saturate(140%);
  border:0.5px solid rgba(251,246,232,0.10);
}
.ll-hero-foot .ll-pt{
  display:flex; gap:14px;
  font-size:clamp(12px,0.9vw,14px); line-height:1.5;
  color:rgba(251,246,232,0.88);
}
.ll-hero-foot .ll-pt .ll-n{
  font-family:var(--ll-mono); font-size:10px; letter-spacing:0.14em;
  color:var(--ll-brass-2);
  flex-shrink:0;
  padding-top:2px;
}

/* ── Transitions ─────────────────────────────── */
.ll-slide[data-state="idle"]{ visibility:hidden; pointer-events:none; }
.ll-slide[data-state="active"]{ visibility:visible; z-index:2; }
.ll-slide[data-state="exiting"]{ visibility:visible; z-index:1; pointer-events:none; }

.ll-slide[data-style="horizontal"]{ transition:transform var(--ll-t) var(--ll-ease-in-out),opacity var(--ll-t) var(--ll-ease-in-out); }
.ll-slide[data-style="horizontal"][data-state="active"]{ transform:translate3d(0,0,0); opacity:1; }
.ll-slide[data-style="horizontal"][data-state="exiting"][data-dir="forward"]{ transform:translate3d(-12%,0,0); opacity:0; }
.ll-slide[data-style="horizontal"][data-state="exiting"][data-dir="back"]{ transform:translate3d(12%,0,0); opacity:0; }
.ll-slide[data-style="horizontal"][data-state="idle"][data-dir="forward"]{ transform:translate3d(12%,0,0); opacity:0; }
.ll-slide[data-style="horizontal"][data-state="idle"][data-dir="back"]{ transform:translate3d(-12%,0,0); opacity:0; }

.ll-slide[data-style="vertical"]{ transition:transform var(--ll-t) var(--ll-ease-in-out),opacity var(--ll-t) var(--ll-ease-in-out); }
.ll-slide[data-style="vertical"][data-state="active"]{ transform:translate3d(0,0,0); opacity:1; }
.ll-slide[data-style="vertical"][data-state="exiting"][data-dir="forward"]{ transform:translate3d(0,-10%,0); opacity:0; }
.ll-slide[data-style="vertical"][data-state="exiting"][data-dir="back"]{ transform:translate3d(0,10%,0); opacity:0; }
.ll-slide[data-style="vertical"][data-state="idle"][data-dir="forward"]{ transform:translate3d(0,10%,0); opacity:0; }
.ll-slide[data-style="vertical"][data-state="idle"][data-dir="back"]{ transform:translate3d(0,-10%,0); opacity:0; }

.ll-slide[data-style="fade"]{ transition:transform var(--ll-t) var(--ll-ease-in-out),opacity var(--ll-t) var(--ll-ease-in-out); }
.ll-slide[data-style="fade"][data-state="active"]{ transform:scale(1); opacity:1; }
.ll-slide[data-style="fade"][data-state="exiting"]{ transform:scale(1.04); opacity:0; }
.ll-slide[data-style="fade"][data-state="idle"]{ transform:scale(0.97); opacity:0; }

.ll-slide[data-style="wipe"]{ transition:clip-path var(--ll-t) var(--ll-ease-in-out),opacity var(--ll-t) var(--ll-ease-in-out); }
.ll-slide[data-style="wipe"][data-state="active"]{ clip-path:inset(0 0 0 0); opacity:1; }
.ll-slide[data-style="wipe"][data-state="exiting"][data-dir="forward"]{ clip-path:inset(0 100% 0 0); opacity:1; }
.ll-slide[data-style="wipe"][data-state="exiting"][data-dir="back"]{ clip-path:inset(0 0 0 100%); opacity:1; }
.ll-slide[data-style="wipe"][data-state="idle"][data-dir="forward"]{ clip-path:inset(0 0 0 100%); opacity:1; }
.ll-slide[data-style="wipe"][data-state="idle"][data-dir="back"]{ clip-path:inset(0 100% 0 0); opacity:1; }

/* Stagger reveals inside the active slide */
.ll-slide[data-state="active"] .ll-reveal{ opacity:1; transform:none; filter:blur(0); }
.ll-reveal{
  opacity:0; transform:translate3d(0,14px,0); filter:blur(4px);
  transition:opacity 900ms var(--ll-ease-out),transform 900ms var(--ll-ease-out),filter 700ms var(--ll-ease-out);
  transition-delay:var(--ll-d,0ms);
}

/* ── Typography ───────────────────────────────── */
.ll-serif{ font-family:var(--ll-serif); font-weight:400; letter-spacing:-0.01em; }
.ll-mono { font-family:var(--ll-mono); font-feature-settings:"tnum","ss01"; }
.ll-eyebrow{
  font-family:var(--ll-mono);
  font-size:11px;
  letter-spacing:0.18em;
  text-transform:uppercase;
  opacity:0.7;
}
.ll-h1{ font-family:var(--ll-serif); font-size:clamp(48px,6.4vw,104px); line-height:0.96; letter-spacing:-0.02em; font-weight:400; }
.ll-h2{ font-family:var(--ll-serif); font-size:clamp(36px,4.6vw,76px); line-height:1.0; letter-spacing:-0.015em; font-weight:400; }
.ll-h3{ font-family:var(--ll-serif); font-size:clamp(22px,2.2vw,34px); line-height:1.08; letter-spacing:-0.01em; font-weight:400; }
.ll-h4{ font-family:var(--ll-serif); font-size:clamp(18px,1.5vw,24px); line-height:1.1; font-weight:400; letter-spacing:-0.005em; }
.ll-body{ font-size:clamp(14px,1.05vw,17px); line-height:1.55; max-width:60ch; }

/* ── Buttons ──────────────────────────────────── */
.ll-btn{
  display:inline-flex; align-items:center; gap:10px;
  padding:12px 22px;
  border:none; cursor:pointer;
  font:500 12px/1 var(--ll-sans);
  letter-spacing:0.14em;
  text-transform:uppercase;
  border-radius:999px;
  background:var(--ll-ink);
  color:var(--ll-cream);
  transition:transform 200ms var(--ll-ease-out),background 200ms;
  text-decoration:none;
}
.ll-btn:hover{ transform:translateY(-1px); }
.ll-btn-ghost{
  background:transparent;
  color:inherit;
  border:0.75px solid currentColor;
}
.ll-btn-brass{ background:var(--ll-brass); color:var(--ll-ink); }
.ll-btn-brass:hover{ background:var(--ll-brass-2); }
.ll-btn .ll-arrow{ width:14px; height:14px; transition:transform 250ms var(--ll-ease-out); }
.ll-btn:hover .ll-arrow{ transform:translateX(4px); }

/* ── Section layout ───────────────────────────── */
.ll-section-pad{
  flex:1; min-height:0;
  padding:clamp(56px,5.5vw,92px) clamp(40px,6vw,96px) clamp(36px,4vw,64px);
  display:flex; flex-direction:column;
}

.ll-meta-strip{
  display:flex; justify-content:space-between; align-items:baseline;
  font-family:var(--ll-mono); font-size:11px; letter-spacing:0.12em;
  text-transform:uppercase; opacity:0.65;
  margin-top:64px;
  white-space:nowrap;
}
.ll-meta-strip > div{ display:flex; gap:18px; white-space:nowrap; }
.ll-meta-strip > div > span{ white-space:nowrap; }
@media (max-width:1100px){
  .ll-meta-strip > div > span:nth-child(2){ display:none; }
}

/* ── Nav ──────────────────────────────────────── */
.ll-nav{
  position:fixed; top:0; left:0; right:0;
  height:64px; z-index:50;
  display:flex; align-items:center; justify-content:space-between;
  padding:0 clamp(24px,4vw,72px);
  pointer-events:none;
  mix-blend-mode:difference;
}
.ll-nav > *{ pointer-events:auto; }
.ll-nav-brand{
  font-family:var(--ll-serif);
  font-size:22px; letter-spacing:-0.01em;
  color:#fff;
  text-decoration:none;
  display:flex; align-items:center; gap:10px;
  white-space:nowrap;
}
.ll-nav-brand .ll-wordmark{ display:inline; }
@media (max-width:1080px){
  .ll-nav-brand .ll-wordmark{ display:none; }
}
.ll-nav-brand .ll-brand-glyph{
  width:32px; height:auto; display:block;
  filter:brightness(0) invert(1);
}
.ll-nav-links{
  display:flex; gap:clamp(14px,1.6vw,24px);
  font-family:var(--ll-mono); font-size:11px; letter-spacing:0.12em; text-transform:uppercase;
  color:#fff;
}
.ll-nav-link{
  position:relative;
  background:transparent; border:0;
  color:#fff; font:inherit;
  cursor:pointer;
  padding:4px 0;
  letter-spacing:inherit;
  transition:opacity 200ms;
  opacity:0.7;
  white-space:nowrap;
}
.ll-nav-link:hover{ opacity:0.95; }
.ll-nav-link.ll-is-active{ opacity:1; }
.ll-nav-link .ll-idx{
  position:absolute; left:-14px; top:50%; transform:translateY(-50%);
  font-size:8px; opacity:0; transition:opacity 200ms;
}
.ll-nav-link.ll-is-active .ll-idx{ opacity:0.6; }
.ll-nav-link .ll-dot{
  position:absolute; left:50%; bottom:-8px;
  width:4px; height:4px; border-radius:50%;
  background:#fff; transform:translate(-50%,-3px) scale(0); opacity:0;
  transition:transform 280ms var(--ll-ease-out),opacity 280ms var(--ll-ease-out);
}
.ll-nav-link.ll-is-active .ll-dot{ transform:translate(-50%,0) scale(1); opacity:1; }

.ll-nav-end{
  display:flex; align-items:center; gap:14px;
  font-family:var(--ll-mono); font-size:11px; letter-spacing:0.12em; text-transform:uppercase;
  color:#fff;
}

.ll-nav-link.ll-is-dashboard{
  text-decoration:none; color:#fff;
  border:0.75px dashed rgba(255,255,255,0.55);
  padding:6px 12px; border-radius:999px;
  display:inline-flex; align-items:center; gap:8px;
  opacity:0.9;
}
.ll-nav-link.ll-is-dashboard:hover{ opacity:1; border-style:solid; }
.ll-nav-link.ll-is-dashboard .ll-ext{
  width:8px; height:8px;
  border-right:1px solid currentColor; border-top:1px solid currentColor;
  transform:rotate(45deg) translate(-1px,1px);
}

.ll-login-trigger{
  position:relative;
  background:transparent; color:#fff; border:0.75px solid #fff;
  font:inherit; padding:8px 14px; border-radius:999px;
  cursor:pointer; letter-spacing:inherit;
  display:inline-flex; align-items:center; gap:8px;
  transition:padding 200ms;
  white-space:nowrap;
}
.ll-login-trigger .ll-caret{
  width:8px; height:8px; border-right:1px solid #fff; border-bottom:1px solid #fff;
  transform:rotate(45deg) translate(-2px,-2px);
  transition:transform 280ms var(--ll-ease-out);
}
.ll-login-trigger.ll-open .ll-caret{ transform:rotate(-135deg) translate(-2px,-2px); }

.ll-nav-register{
  background:#fff; color:#000; border:0;
  padding:9px 14px; border-radius:999px;
  font:inherit; letter-spacing:inherit;
  cursor:pointer;
  white-space:nowrap;
  text-decoration:none;
  display:inline-flex; align-items:center;
}
@media (max-width:1240px){
  .ll-nav-register{ display:none; }
}

/* ── Login cascading form ─────────────────────── */
.ll-login-shell{
  position:fixed;
  top:56px;
  z-index:49;
  width:340px;
  pointer-events:none;
}
.ll-login-shell.ll-open{ pointer-events:auto; }

.ll-login-panel{
  position:relative;
  background:var(--ll-ink);
  color:var(--ll-cream);
  border-radius:18px;
  padding:22px 22px 18px;
  box-shadow:0 1px 0 rgba(255,255,255,0.06) inset,
             0 24px 60px -10px rgba(0,0,0,0.45),
             0 0 0 0.5px rgba(255,255,255,0.08);
  transform-origin:top right;
  transform:translateY(-12px) scale(0.86);
  opacity:0;
  transition:opacity 320ms var(--ll-ease-out),transform 420ms var(--ll-ease-out);
  overflow:hidden;
}
.ll-login-shell.ll-open .ll-login-panel{
  transform:translateY(0) scale(1);
  opacity:1;
}
.ll-login-panel::before{
  content:""; position:absolute; top:-6px; right:28px;
  width:12px; height:12px; background:var(--ll-ink);
  transform:rotate(45deg);
  border-radius:2px;
}

.ll-login-head{
  display:flex; justify-content:space-between; align-items:baseline;
  font-family:var(--ll-mono); font-size:10px; letter-spacing:0.14em; text-transform:uppercase;
  color:rgba(243,238,226,0.55);
  padding-bottom:12px;
  border-bottom:0.5px solid rgba(243,238,226,0.12);
  margin-bottom:14px;
}
.ll-login-head .ll-title{ color:var(--ll-cream); }

.ll-login-title{
  font-family:var(--ll-serif);
  font-size:24px; line-height:1.1; letter-spacing:-0.01em;
  margin:0 0 6px;
}
.ll-login-sub{
  font-size:12px; line-height:1.45; opacity:0.65;
  margin:0 0 16px;
}

.ll-cascade-item{
  opacity:0;
  transform:translateY(-10px);
  filter:blur(3px);
  transition:opacity 320ms var(--ll-ease-out),transform 360ms var(--ll-ease-out),filter 280ms var(--ll-ease-out);
  transition-delay:0ms;
}
.ll-login-shell.ll-open .ll-cascade-item{
  opacity:1; transform:translateY(0); filter:blur(0);
  transition-delay:calc(180ms + var(--ll-i,0) * 60ms);
}

.ll-field{
  display:flex; flex-direction:column; gap:6px;
  margin-bottom:14px;
}
.ll-field label{
  font-family:var(--ll-mono); font-size:10px; letter-spacing:0.14em; text-transform:uppercase;
  color:rgba(243,238,226,0.55);
}
.ll-field input{
  background:transparent;
  border:none;
  border-bottom:0.75px solid rgba(243,238,226,0.22);
  color:var(--ll-cream);
  font:400 15px/1.2 var(--ll-sans);
  padding:6px 0 8px;
  outline:none;
  transition:border-color 200ms;
}
.ll-field input::placeholder{ color:rgba(243,238,226,0.32); }
.ll-field input:focus{ border-bottom-color:var(--ll-brass); }

.ll-row-between{ display:flex; justify-content:space-between; align-items:center; }
.ll-tiny{ font-family:var(--ll-mono); font-size:10px; letter-spacing:0.12em; text-transform:uppercase; opacity:0.65; }
.ll-tiny a, .ll-tiny .ll-linkish{
  color:var(--ll-cream); text-decoration:none; background:transparent; border:0; cursor:pointer;
  font:inherit; letter-spacing:inherit; text-transform:inherit;
  border-bottom:0.5px solid rgba(243,238,226,0.4);
  padding-bottom:1px;
}

.ll-login-cta{
  width:100%; margin-top:6px;
  background:var(--ll-brass); color:var(--ll-ink);
  border:0; padding:14px; border-radius:999px;
  font:500 12px/1 var(--ll-sans);
  letter-spacing:0.16em; text-transform:uppercase;
  cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px;
  transition:background 200ms;
}
.ll-login-cta:hover{ background:var(--ll-brass-2); }
.ll-login-cta:disabled{ opacity:0.7; cursor:progress; }

.ll-login-foot{
  margin-top:14px; padding-top:12px;
  border-top:0.5px solid rgba(243,238,226,0.10);
  text-align:center;
  display:flex; flex-direction:column; gap:6px;
}

.ll-login-success{ text-align:center; padding:12px 0 8px; }
.ll-login-success .ll-check{
  width:44px; height:44px; border-radius:50%;
  background:var(--ll-brass); color:var(--ll-ink);
  display:inline-flex; align-items:center; justify-content:center;
  font-size:22px; font-family:var(--ll-serif);
  margin:4px auto 14px;
}
.ll-login-success .ll-msg{ font-family:var(--ll-serif); font-size:22px; line-height:1.15; margin-bottom:6px; }
.ll-login-success .ll-sub{ font-family:var(--ll-mono); font-size:10px; letter-spacing:0.14em; text-transform:uppercase; opacity:0.6; }

.ll-scrim{
  position:fixed; inset:0; z-index:48;
  background:transparent;
}

/* ── Chip ─────────────────────────────────────── */
.ll-chip{
  display:inline-flex; align-items:center; gap:8px;
  padding:6px 12px;
  border:0.5px solid currentColor; border-radius:999px;
  font-family:var(--ll-mono); font-size:10px; letter-spacing:0.14em; text-transform:uppercase;
  opacity:0.85;
}

/* ── Section: HOME ────────────────────────────── */
.ll-home-actions{ display:flex; gap:10px; flex-wrap:wrap; margin-top:4px; }

/* ── Section: FEATURES ────────────────────────── */
.ll-features-head{
  display:flex; align-items:flex-end; justify-content:space-between;
  gap:24px; margin-bottom:clamp(24px,2.6vw,40px);
}
.ll-features-head .ll-h2{ max-width:16ch; }
.ll-features-wrap{
  flex:1; min-height:0;
  display:grid;
  grid-template-columns:1.05fr 1fr;
  gap:clamp(24px,3vw,56px);
}
.ll-features-mock{
  min-height:0;
  display:flex; flex-direction:column;
  border:0.5px solid var(--ll-hairline);
  border-radius:8px;
  overflow:hidden;
}
.ll-features-mock .ll-frame-bar{
  display:flex; align-items:center; gap:8px;
  padding:10px 14px;
  background:rgba(31,52,52,0.04);
  border-bottom:0.5px solid var(--ll-hairline);
  font-family:var(--ll-mono); font-size:10px; letter-spacing:0.12em; text-transform:uppercase;
  color:rgba(31,52,52,0.55);
}
.ll-features-mock .ll-frame-bar .ll-dots{ display:flex; gap:5px; margin-right:8px; }
.ll-features-mock .ll-frame-bar .ll-dot{ width:7px; height:7px; border-radius:50%; background:rgba(31,52,52,0.18); }
.ll-feature-stage{
  flex:1; min-height:0; position:relative; overflow:hidden;
  background:rgba(31,52,52,0.04);
  animation:ll-fade-in 480ms var(--ll-ease-out) both;
}
.ll-feature-stage img{
  width:100%; height:100%; object-fit:cover; object-position:top left;
  display:block;
}
.ll-feature-stage.ll-is-mobile{
  display:flex; align-items:center; justify-content:center;
  padding:18px;
  background:linear-gradient(180deg,rgba(31,52,52,0.04),rgba(31,52,52,0.10));
}
.ll-feature-stage.ll-is-mobile img{
  width:auto; height:100%;
  object-fit:contain; object-position:center;
  filter:drop-shadow(0 16px 30px rgba(31,52,52,0.18));
}
@keyframes ll-fade-in{
  from{ opacity:0; transform:scale(1.015); }
  to  { opacity:1; transform:scale(1); }
}

.ll-features-list{
  display:flex; flex-direction:column;
  min-height:0;
  gap:1px;
  background:var(--ll-hairline);
  border:0.5px solid var(--ll-hairline);
  border-radius:8px;
  overflow:hidden;
}
.ll-feature{
  background:var(--ll-cream);
  padding:clamp(14px,1.3vw,20px) clamp(16px,1.6vw,24px);
  display:grid; grid-template-columns:36px 1fr auto; gap:14px; align-items:center;
  cursor:pointer; text-align:left; border:0; font:inherit; color:inherit; width:100%;
  transition:background 200ms;
}
.ll-feature:hover{ background:var(--ll-cream-2); }
.ll-feature.ll-is-active{ background:var(--ll-ink); color:var(--ll-cream); }
.ll-feature .ll-n{
  font-family:var(--ll-mono); font-size:10px; letter-spacing:0.14em; opacity:0.6;
}
.ll-feature .ll-ttl{ font-family:var(--ll-serif); font-size:clamp(18px,1.5vw,22px); line-height:1.1; }
.ll-feature .ll-desc{
  font-size:12.5px; line-height:1.45; opacity:0.72;
  margin-top:4px;
  display:none;
}
.ll-feature.ll-is-active .ll-desc{ display:block; }
.ll-feature .ll-more{
  width:22px; height:22px; border-radius:50%;
  border:0.5px solid currentColor;
  display:flex; align-items:center; justify-content:center;
  opacity:0.6;
  transition:transform 200ms;
}
.ll-feature.ll-is-active .ll-more{ transform:rotate(90deg); opacity:1; }
.ll-feature.ll-is-active .ll-more .ll-arr{ stroke:var(--ll-cream); }
.ll-feature .ll-grow{ display:flex; flex-direction:column; }

/* ── Section: HOW IT WORKS ────────────────────── */
.ll-how-head{ margin-bottom:clamp(24px,3vw,48px); }
.ll-how-head .ll-h2{ max-width:22ch; }
.ll-how-rail{
  flex:1;
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:1px;
  background:rgba(243,238,226,0.18);
  border:0.5px solid rgba(243,238,226,0.18);
  border-radius:8px;
  overflow:hidden;
  min-height:0;
}
.ll-step{
  background:var(--ll-ink);
  padding:clamp(20px,1.8vw,28px);
  display:flex; flex-direction:column;
  gap:14px;
  position:relative;
  min-height:0;
}
.ll-step .ll-top{ display:flex; justify-content:space-between; align-items:baseline; }
.ll-step .ll-n{ font-family:var(--ll-mono); font-size:11px; letter-spacing:0.16em; opacity:0.6; }
.ll-step .ll-arr{
  width:18px; height:1px; background:currentColor; opacity:0.4;
  position:relative;
}
.ll-step .ll-arr::after{
  content:""; position:absolute; right:0; top:-3px;
  border:solid currentColor; border-width:1px 1px 0 0;
  width:6px; height:6px;
  transform:rotate(45deg);
}
.ll-step:last-child .ll-arr{ display:none; }
.ll-step .ll-ttl{ font-family:var(--ll-serif); font-size:clamp(20px,1.7vw,26px); line-height:1.08; }
.ll-step .ll-desc{ font-size:12.5px; line-height:1.5; opacity:0.78; }

/* ── Section: WHO IT'S FOR ────────────────────── */
.ll-who-head{
  display:flex; align-items:flex-end; justify-content:space-between;
  gap:24px; margin-bottom:clamp(24px,3vw,48px);
}
.ll-who-head .ll-h2{ max-width:18ch; }
.ll-who-grid{
  flex:1; min-height:0;
  display:grid; grid-template-columns:repeat(4,1fr); gap:1px;
  background:var(--ll-hairline);
  border:0.5px solid var(--ll-hairline);
  border-radius:8px;
  overflow:hidden;
}
.ll-role{
  background:var(--ll-cream-2);
  padding:clamp(20px,1.8vw,32px);
  display:flex; flex-direction:column; gap:14px;
  transition:background 220ms;
}
.ll-role:hover{ background:var(--ll-cream-3); }
.ll-role .ll-n{ font-family:var(--ll-mono); font-size:11px; letter-spacing:0.16em; opacity:0.55; }
.ll-role .ll-name{ font-family:var(--ll-serif); font-size:clamp(22px,1.85vw,30px); line-height:1.05; }
.ll-role .ll-desc-text{ font-size:13px; line-height:1.55; opacity:0.78; flex:1; }
.ll-role .ll-ph{
  aspect-ratio:1.4/1;
  border-radius:4px;
  overflow:hidden;
  position:relative;
}
.ll-role .ll-ph img{
  width:100%; height:100%; object-fit:cover; object-position:left center; display:block;
}
.ll-ph-corners{ position:absolute; inset:0; pointer-events:none; }
.ll-corner{
  position:absolute; width:10px; height:10px;
  border:0.75px solid rgba(31,52,52,0.4);
}
.ll-c-tl{ top:8px; left:8px; border-right:0; border-bottom:0; }
.ll-c-tr{ top:8px; right:8px; border-left:0; border-bottom:0; }
.ll-c-bl{ bottom:8px; left:8px; border-right:0; border-top:0; }
.ll-c-br{ bottom:8px; right:8px; border-left:0; border-top:0; }

/* ── Section: PRICING ─────────────────────────── */
.ll-pricing-wrap{
  flex:1; display:grid;
  grid-template-columns:1fr 1.1fr;
  gap:clamp(36px,5vw,80px);
  align-items:center;
  min-height:0;
}
.ll-pricing-left{ display:flex; flex-direction:column; gap:18px; }
.ll-pricing-left .ll-h2{ max-width:14ch; }
.ll-pricing-left .ll-body{ opacity:0.7; }
.ll-pricing-card{
  background:var(--ll-ink);
  color:var(--ll-cream);
  border-radius:14px;
  padding:clamp(28px,2.6vw,40px);
  display:flex; flex-direction:column; gap:14px;
  border:0.5px solid rgba(243,238,226,0.1);
  position:relative;
  overflow:hidden;
}
.ll-pricing-card::after{
  content:""; position:absolute; right:-60px; top:-60px;
  width:240px; height:240px;
  background:radial-gradient(circle,rgba(184,149,106,0.18),transparent 60%);
  pointer-events:none;
}
.ll-pricing-card .ll-badge{
  display:inline-flex; align-self:flex-start;
  font-family:var(--ll-mono); font-size:10px; letter-spacing:0.14em; text-transform:uppercase;
  padding:5px 10px; border:0.5px solid rgba(243,238,226,0.35);
  border-radius:999px;
}
.ll-pricing-card .ll-plan{ font-family:var(--ll-serif); font-size:clamp(28px,2.4vw,38px); line-height:1.1; }
.ll-pricing-card .ll-lead{ font-size:13px; line-height:1.55; opacity:0.78; max-width:36ch; }
.ll-pricing-card .ll-price{
  display:flex; align-items:baseline; gap:8px; margin-top:4px;
}
.ll-pricing-card .ll-amt{ font-family:var(--ll-serif); font-size:clamp(48px,4.2vw,68px); line-height:1; letter-spacing:-0.01em; }
.ll-pricing-card .ll-per{ font-family:var(--ll-mono); font-size:12px; letter-spacing:0.08em; opacity:0.7; }
.ll-pricing-card .ll-billed{ font-family:var(--ll-mono); font-size:11px; letter-spacing:0.08em; opacity:0.6; margin-top:-4px; }
.ll-pricing-card .ll-feats{
  display:grid; grid-template-columns:1fr 1fr; gap:6px 18px;
  margin-top:8px;
  font-size:12.5px; line-height:1.4;
  padding-top:14px;
  border-top:0.5px solid rgba(243,238,226,0.12);
  list-style:none;
  padding-left:0;
}
.ll-pricing-card .ll-feats li{
  display:flex; gap:8px; align-items:flex-start;
  opacity:0.85;
}
.ll-pricing-card .ll-feats li::before{
  content:"+"; color:var(--ll-brass);
  font-family:var(--ll-mono); font-weight:500;
  flex-shrink:0;
}
.ll-pricing-card .ll-cta-row{
  display:flex; gap:10px; align-items:center; flex-wrap:wrap;
  margin-top:6px;
}
.ll-pricing-card .ll-cta-row .ll-note{ font-family:var(--ll-mono); font-size:10px; letter-spacing:0.12em; text-transform:uppercase; opacity:0.55; }

/* ── Progress strip ───────────────────────────── */
.ll-progress{
  position:fixed; left:0; right:0; bottom:18px; z-index:30;
  display:flex; justify-content:center; align-items:center; gap:10px;
  mix-blend-mode:difference;
  pointer-events:none;
}
.ll-progress .ll-num{
  font-family:var(--ll-mono); font-size:10px; letter-spacing:0.14em; color:#fff;
  text-transform:uppercase;
}
.ll-progress .ll-track{
  width:220px; height:1px; background:rgba(255,255,255,0.3);
  position:relative;
}
.ll-progress .ll-fill{
  position:absolute; left:0; top:0; bottom:0; background:#fff;
  transition:width var(--ll-t) var(--ll-ease-in-out);
}

.ll-hint{
  position:fixed; right:clamp(24px,4vw,72px); bottom:22px; z-index:30;
  font-family:var(--ll-mono); font-size:10px; letter-spacing:0.14em; text-transform:uppercase;
  opacity:0.55;
  mix-blend-mode:difference; color:#fff;
  display:flex; gap:10px; align-items:center;
  white-space:nowrap;
}
@media (max-width:1100px){ .ll-hint{ display:none; } }
.ll-hint kbd{
  display:inline-flex; align-items:center; justify-content:center;
  min-width:18px; height:18px; padding:0 5px;
  border:0.5px solid currentColor; border-radius:4px;
  font-family:var(--ll-mono); font-size:10px;
}

.ll-spinner{
  width:12px; height:12px; border-radius:50%;
  border:1.5px solid rgba(31,52,52,0.3);
  border-top-color:var(--ll-ink);
  animation:ll-sp 0.8s linear infinite;
}
@keyframes ll-sp{ to{ transform:rotate(360deg); } }
`;

// ─── Section definitions ──────────────────────────────────────────────────────
const SECTIONS = [
  { key: "home",     label: "Home",         style: "fade"       },
  { key: "features", label: "Features",     style: "horizontal" },
  { key: "how",      label: "How it works", style: "wipe"       },
  { key: "who",      label: "Who it's for", style: "horizontal" },
  { key: "pricing",  label: "Pricing",      style: "vertical"   },
];

// ─── Section: HOME ────────────────────────────────────────────────────────────
function HomeSection({ onNavigate }: { onNavigate: (i: number) => void }) {
  return (
    <div className="ll-section-pad ll-theme-hero">
      <div className="ll-hero-bg" aria-hidden="true">
        <img src="/images/hero-cessna.jpg" alt="" />
        <div className="ll-hero-scrim" />
      </div>

      <div className="ll-meta-strip ll-reveal" style={{ "--ll-d": "80ms" } as React.CSSProperties}>
        <div>
          <span>01 — Index</span>
          <span>Training &amp; compliance platform</span>
        </div>
        <div>
          <span>EASA ATO</span>
          <span>© 2026 Flight Lyceum</span>
        </div>
      </div>

      <div className="ll-hero-content" style={{ marginTop: "auto" }}>
        <div className="ll-hero-text">
          <span className="ll-eyebrow ll-reveal" style={{ "--ll-d": "160ms" } as React.CSSProperties}>
            Flight Lyceum — Compliance &amp; Training Platform
          </span>
          <h1 className="ll-h1 ll-reveal" style={{ "--ll-d": "240ms" } as React.CSSProperties}>
            AI-driven<br />
            compliance<br />
            <em>intelligence.</em><br />
            Human-approved control.
          </h1>
          <p className="ll-body ll-reveal" style={{ "--ll-d": "360ms", maxWidth: "58ch" } as React.CSSProperties}>
            Flight Lyceum monitors 40+ EASA regulatory families, flags affected manual sections,
            and drafts plain-language updates for review. AI removes the tedious manual tracking work,
            while your compliance team always reviews, edits, approves, or rejects every controlled change.
          </p>
          <div className="ll-home-actions ll-reveal" style={{ "--ll-d": "460ms" } as React.CSSProperties}>
            <a className="ll-btn ll-btn-brass" href="https://flightlyceum.com/register" target="_blank" rel="noreferrer">
              Start 30-day free trial
              <svg className="ll-arrow" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M1 7h12M8 2l5 5-5 5" />
              </svg>
            </a>
            <button className="ll-btn ll-btn-ghost" onClick={() => onNavigate(2)}>
              See how it works →
            </button>
          </div>
        </div>

        <div className="ll-hero-foot ll-reveal" style={{ "--ll-d": "600ms" } as React.CSSProperties}>
          <div className="ll-pt">
            <span className="ll-n">A</span>
            <span>AI does the monitoring, matching, and first draft. Humans make the compliance decisions.</span>
          </div>
          <div className="ll-pt">
            <span className="ll-n">B</span>
            <span>Manual update tedium drops away: affected sections are flagged and drafted for human review in minutes.</span>
          </div>
          <div className="ll-pt">
            <span className="ll-n">C</span>
            <span>Every approval, rollback, and acknowledgement is logged. Time machine can restore retained versions by date.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: FEATURES ───────────────────────────────────────────────────────
const FEATURES = [
  { n: "01", ttl: "Compliance overview",
    desc: "See pending EASA changes, manuals due for review, and acknowledgement rates from one quiet dashboard.",
    img: "/images/dashboard-overview.jpg",
    cap: "Dashboard · Compliance Overview" },
  { n: "02", ttl: "AI impact assessment",
    desc: "When a regulation changes, AI flags affected manual sections and drafts plain-language updates. Your team has the final say before anything is applied.",
    img: "/images/change-impact-review.jpg",
    cap: "Change Review · AI Draft" },
  { n: "03", ttl: "Time machine rollback",
    desc: "Restore any manual section to a previous version by date. Every approval, edit, and rollback stays in the audit trail.",
    img: "/images/dashboard-overview.jpg",
    cap: "Version History" },
  { n: "04", ttl: "Read & acknowledge",
    desc: "Assign reading to instructors and students. Know exactly who has read, who hasn't, and when.",
    img: "/images/acknowledgement-tracking.jpg",
    cap: "Assignments · Acknowledgements" },
  { n: "05", ttl: "Mobile-first for students",
    desc: "Students read, understand, and acknowledge updates from their phone, before the next lesson.",
    img: "/images/mobile-student-view.jpg",
    cap: "Mobile · Student Read & Acknowledge" },
];

function FeaturesSection() {
  const [active, setActive] = useState(0);
  const f = FEATURES[active];
  const isMobile = active === 4;
  return (
    <div className="ll-section-pad ll-theme-cream">
      <div className="ll-meta-strip ll-reveal" style={{ "--ll-d": "80ms" } as React.CSSProperties}>
        <div><span>02 — Features</span><span>Product</span></div>
        <div><span>Built for ATOs</span><span>EASA aligned</span></div>
      </div>

      <div className="ll-features-head" style={{ marginTop: "6vh" }}>
        <h2 className="ll-h2 ll-reveal" style={{ "--ll-d": "180ms" } as React.CSSProperties}>
          Built for the way<br />
          ATOs <em>actually</em> work.
        </h2>
        <p className="ll-body ll-reveal" style={{ "--ll-d": "260ms", opacity: 0.7 } as React.CSSProperties}>
          Five linked surfaces — one approved source of truth for the regulation,
          the manual, the instructor, and the student.
        </p>
      </div>

      <div className="ll-features-wrap ll-reveal" style={{ "--ll-d": "360ms" } as React.CSSProperties}>
        <div className="ll-features-mock">
          <div className="ll-frame-bar">
            <span className="ll-dots">
              <span className="ll-dot" />
              <span className="ll-dot" />
              <span className="ll-dot" />
            </span>
            <span style={{ flex: 1 }}>{f.cap}</span>
            <span style={{ opacity: 0.5 }}>app.flightlyceum.com</span>
          </div>
          <div className={"ll-feature-stage " + (isMobile ? "ll-is-mobile" : "")} key={active}>
            <img src={f.img} alt={f.ttl} />
          </div>
        </div>

        <div className="ll-features-list">
          {FEATURES.map((it, i) => (
            <button
              key={i}
              className={"ll-feature " + (i === active ? "ll-is-active" : "")}
              onClick={() => setActive(i)}
            >
              <span className="ll-n">{it.n}</span>
              <span className="ll-grow">
                <span className="ll-ttl">{it.ttl}</span>
                <span className="ll-desc">{it.desc}</span>
              </span>
              <span className="ll-more">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path className="ll-arr" d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section: HOW IT WORKS ───────────────────────────────────────────────────
function HowSection() {
  const steps = [
    { n: "Step 01", ttl: "Monitor EASA changes",    desc: "Regulatory updates from EASA are automatically detected, summarised by AI, and surfaced in your compliance queue." },
    { n: "Step 02", ttl: "Review and approve",      desc: "AI recommends the change. Your compliance team reviews the evidence, edits the wording, and approves or rejects the update." },
    { n: "Step 03", ttl: "Assign reading",          desc: "Distribute approved updates to the right instructors and students based on programme, lesson stage, or aircraft type." },
    { n: "Step 04", ttl: "Track acknowledgements",  desc: "See exactly who has read, acknowledged, and completed required action, before the next lesson or audit." },
    { n: "Step 05", ttl: "Roll back by date",       desc: "Use Time machine to compare versions and restore a section to a specific earlier state whenever needed." },
  ];
  return (
    <div className="ll-section-pad ll-theme-ink">
      <div className="ll-meta-strip ll-reveal" style={{ "--ll-d": "80ms" } as React.CSSProperties}>
        <div><span>03 — How it works</span><span>Workflow</span></div>
        <div><span>EASA change → instructor sign-off</span><span>One workflow</span></div>
      </div>

      <div className="ll-how-head" style={{ marginTop: "6vh" }}>
        <h2 className="ll-h2 ll-reveal" style={{ "--ll-d": "180ms" } as React.CSSProperties}>
          From EASA change<br />
          to instructor <em>sign-off</em><br />
          in one workflow.
        </h2>
      </div>

      <div className="ll-how-rail ll-reveal" style={{ "--ll-d": "360ms" } as React.CSSProperties}>
        {steps.map((s, i) => (
          <div className="ll-step" key={i}>
            <div className="ll-top">
              <span className="ll-n">{s.n}</span>
              <span className="ll-arr" />
            </div>
            <div className="ll-ttl">{s.ttl}</div>
            <div className="ll-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: WHO IT'S FOR ───────────────────────────────────────────────────
function WhoSection() {
  const roles = [
    { n: "01", name: "Head of Training",    desc: "See pending reads, critical regulation changes, and training impact across the entire school from one dashboard.", img: "/images/dashboard-overview.jpg" },
    { n: "02", name: "Compliance Managers", desc: "Track approvals, regulation mappings, version history, and audit trails, without spreadsheet workarounds.", img: "/images/change-impact-review.jpg" },
    { n: "03", name: "Instructors",         desc: "Fast access to current procedures, lesson-linked documents, and pending sign-offs from wherever you are.", img: "/images/acknowledgement-tracking.jpg" },
    { n: "04", name: "Students",            desc: "Read assigned material on mobile, understand what changed, and acknowledge updates in seconds.", img: "/images/mobile-student-view.jpg" },
  ];
  return (
    <div className="ll-section-pad ll-theme-cream-2">
      <div className="ll-meta-strip ll-reveal" style={{ "--ll-d": "80ms" } as React.CSSProperties}>
        <div><span>04 — Who it&apos;s for</span><span>Roles</span></div>
        <div><span>One source of truth</span><span>Four workflows</span></div>
      </div>

      <div className="ll-who-head" style={{ marginTop: "6vh" }}>
        <h2 className="ll-h2 ll-reveal" style={{ "--ll-d": "180ms" } as React.CSSProperties}>
          One platform for compliance teams,<br />
          <em>instructors,</em> and students.
        </h2>
        <p className="ll-body ll-reveal" style={{ "--ll-d": "260ms", opacity: 0.72 } as React.CSSProperties}>
          The same approved source of truth serves different roles
          without forcing everyone into the same workflow.
        </p>
      </div>

      <div className="ll-who-grid ll-reveal" style={{ "--ll-d": "360ms" } as React.CSSProperties}>
        {roles.map((r, i) => (
          <div className="ll-role" key={i}>
            <span className="ll-n">{r.n}</span>
            <div className="ll-ph" style={{ position: "relative" }}>
              <img src={r.img} alt={r.name} />
              <div className="ll-ph-corners">
                <span className="ll-corner ll-c-tl" />
                <span className="ll-corner ll-c-tr" />
                <span className="ll-corner ll-c-bl" />
                <span className="ll-corner ll-c-br" />
              </div>
            </div>
            <div className="ll-name">{r.name}</div>
            <p className="ll-desc-text">{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: PRICING ────────────────────────────────────────────────────────
function PricingSection() {
  const feats = [
    "30-day free trial. Card held, not charged until day 31",
    "50 student accounts included (add 10 more anytime)",
    "EASA change monitoring across 40+ regulatory families",
    "AI impact assessment and plain-language draft updates",
    "Controlled manuals with full revision history and rollback",
    "Read-and-acknowledge workflows for instructors and students",
    "Lesson-linked reading assignments by programme and phase",
    "Audit-ready export pack for authority oversight visits",
    "Admin workspace with user roles and onboarding checklist",
    "Mobile-friendly student access",
    "Email digest of weekly EASA changes",
  ];
  return (
    <div className="ll-section-pad ll-theme-cream">
      <div className="ll-meta-strip ll-reveal" style={{ "--ll-d": "80ms" } as React.CSSProperties}>
        <div><span>05 — Pricing</span><span>Subscription</span></div>
        <div><span>30-day free trial</span><span>Stripe billing</span></div>
      </div>

      <div className="ll-pricing-wrap" style={{ marginTop: "6vh" }}>
        <div className="ll-pricing-left">
          <span className="ll-eyebrow ll-reveal" style={{ "--ll-d": "160ms" } as React.CSSProperties}>Pricing</span>
          <h2 className="ll-h2 ll-reveal" style={{ "--ll-d": "240ms" } as React.CSSProperties}>
            Choose the plan that works<br />
            for your <em>flight school.</em>
          </h2>
          <p className="ll-body ll-reveal" style={{ "--ll-d": "340ms", opacity: 0.72 } as React.CSSProperties}>
            Start with a 30-day free trial. A card is required but you won&apos;t be charged
            until day 31. Pay securely through Stripe on a monthly or annual subscription.
          </p>
          <p className="ll-body ll-reveal" style={{ "--ll-d": "420ms", opacity: 0.6, fontSize: "13px" } as React.CSSProperties}>
            Need multi-base access, custom integrations, or migration support?{" "}
            <a href="https://flightlyceum.com/contact" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              Contact us
            </a>{" "}
            for an enterprise quote.
          </p>
        </div>

        <div className="ll-pricing-card ll-reveal" style={{ "--ll-d": "460ms" } as React.CSSProperties}>
          <span className="ll-badge">One plan · Everything included</span>
          <div className="ll-plan">Flight Lyceum ATO</div>
          <div className="ll-lead">Full compliance and training platform for EASA Approved Training Organisations.</div>

          <div className="ll-price">
            <span className="ll-amt">€167</span>
            <span className="ll-per">/ mo, billed annually</span>
          </div>
          <div className="ll-billed">€2,000 billed once per year · Annual saves 2 months</div>

          <ul className="ll-feats">
            {feats.map((x, i) => <li key={i}>{x}</li>)}
          </ul>

          <div className="ll-cta-row">
            <a className="ll-btn ll-btn-brass" href="https://flightlyceum.com/register?plan=annual" target="_blank" rel="noreferrer">
              Start 30-day free trial
              <svg className="ll-arrow" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M1 7h12M8 2l5 5-5 5" />
              </svg>
            </a>
            <span className="ll-note">Card required. You won&apos;t be charged until day 31.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function LandingNav({
  current,
  onNav,
  onLogin,
  loginOpen,
  loginBtnRef,
}: {
  current: number;
  onNav: (i: number) => void;
  onLogin: () => void;
  loginOpen: boolean;
  loginBtnRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <nav className="ll-nav" aria-label="Primary">
      <button
        className="ll-nav-brand"
        style={{ background: "none", border: "none", cursor: "pointer" }}
        onClick={() => onNav(0)}
      >
        <img className="ll-brand-glyph" src="/images/logo-wings.png" alt="Flight Lyceum" />
        <span className="ll-wordmark">Flight Lyceum</span>
      </button>

      <div className="ll-nav-links">
        {SECTIONS.map((s, i) => (
          <button
            key={s.key}
            className={"ll-nav-link " + (current === i ? "ll-is-active" : "")}
            onClick={() => onNav(i)}
          >
            <span className="ll-idx">{String(i + 1).padStart(2, "0")}</span>
            {s.label}
            <span className="ll-dot" />
          </button>
        ))}
      </div>

      <div className="ll-nav-end">
        <a className="ll-nav-link ll-is-dashboard" href="/dashboard" target="_blank" rel="noreferrer">
          Dashboard
          <span className="ll-ext" />
        </a>
        <button
          ref={loginBtnRef as React.RefObject<HTMLButtonElement>}
          className={"ll-login-trigger " + (loginOpen ? "ll-open" : "")}
          onClick={onLogin}
          aria-expanded={loginOpen}
        >
          {loginOpen ? "Close" : "Sign In"}
          <span className="ll-caret" />
        </button>
        <a className="ll-nav-register ll-btn" href="/login" style={{ background: "#fff", color: "#000" }}>
          Register School
        </a>
      </div>
    </nav>
  );
}

// ─── Login Cascade ────────────────────────────────────────────────────────────
function LoginCascade({
  open,
  onClose,
  anchor,
}: {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLButtonElement | null>;
}) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [right, setRight] = useState(120);

  useEffect(() => {
    function update() {
      if (!anchor.current) return;
      const r = anchor.current.getBoundingClientRect();
      setRight(Math.max(16, window.innerWidth - r.right));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [anchor, open]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => { setSubmitting(false); setSuccess(false); }, 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSuccess(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 1000);
    }, 700);
  }

  return (
    <>
      {open && <div className="ll-scrim" onClick={onClose} />}
      <div
        className={"ll-login-shell " + (open ? "ll-open" : "")}
        style={{ right: right + "px" }}
        aria-hidden={!open}
      >
        <div className="ll-login-panel">
          {!success ? (
            <>
              <div className="ll-login-head ll-cascade-item" style={{ "--ll-i": 0 } as React.CSSProperties}>
                <span className="ll-title">Sign in</span>
                <span>Flight Lyceum</span>
              </div>

              <div className="ll-cascade-item" style={{ "--ll-i": 1 } as React.CSSProperties}>
                <h3 className="ll-login-title">Access your organisation workspace</h3>
                <p className="ll-login-sub">Sign in with your organisation email address and password.</p>
              </div>

              <form onSubmit={submit}>
                <div className="ll-cascade-item ll-field" style={{ "--ll-i": 2 } as React.CSSProperties}>
                  <label htmlFor="ll-email">Email</label>
                  <input
                    id="ll-email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@your-ato.eu" autoComplete="username" required
                  />
                </div>

                <div className="ll-cascade-item ll-field" style={{ "--ll-i": 3 } as React.CSSProperties}>
                  <label htmlFor="ll-pw">Password</label>
                  <input
                    id="ll-pw" type="password" value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder="••••••••••" autoComplete="current-password" required
                  />
                </div>

                <div className="ll-cascade-item ll-row-between ll-tiny" style={{ "--ll-i": 4, marginBottom: 10 } as React.CSSProperties}>
                  <span />
                  <a className="ll-linkish" href="/forgot-password" target="_blank" rel="noreferrer">
                    Forgot password?
                  </a>
                </div>

                <div className="ll-cascade-item" style={{ "--ll-i": 5 } as React.CSSProperties}>
                  <button type="submit" className="ll-login-cta" disabled={submitting}>
                    {submitting ? (
                      <><span className="ll-spinner" /> Authenticating</>
                    ) : (
                      <>
                        Login
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                          <path d="M0.5 5h11M7 1l4 4-4 4" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>

                <div className="ll-cascade-item ll-login-foot ll-tiny" style={{ "--ll-i": 6 } as React.CSSProperties}>
                  <span style={{ opacity: 0.7 }}>New here?</span>
                  <a className="ll-linkish" href="/register" target="_blank" rel="noreferrer">
                    Register a new flight school workspace
                  </a>
                  <span style={{ opacity: 0.5, marginTop: 2 }}>or ask your admin for an invite.</span>
                </div>
              </form>
            </>
          ) : (
            <div className="ll-login-success">
              <div className="ll-check">✓</div>
              <div className="ll-msg">Cleared for departure.</div>
              <div className="ll-sub">Routing to dashboard…</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main LandingPage component ───────────────────────────────────────────────
export default function LandingPage() {
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [loginOpen, setLoginOpen] = useState(false);
  const loginBtnRef = useRef<HTMLButtonElement | null>(null);
  const speed = 720;

  const navigate = useCallback((next: number) => {
    if (next === current) return;
    setDirection(next > current ? "forward" : "back");
    setPrevious(current);
    setCurrent(next);
    setLoginOpen(false);
  }, [current]);

  // Clear previous after transition completes
  useEffect(() => {
    if (previous === null) return;
    const id = setTimeout(() => setPrevious(null), speed + 60);
    return () => clearTimeout(id);
  }, [previous]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        navigate(Math.min(SECTIONS.length - 1, current + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        navigate(Math.max(0, current - 1));
      } else if (/^[1-5]$/.test(e.key)) {
        navigate(parseInt(e.key, 10) - 1);
      } else if (e.key === "l" || e.key === "L") {
        setLoginOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, navigate]);

  // Wheel nav (debounced)
  useEffect(() => {
    let lastFire = 0;
    const onWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastFire < speed + 120) return;
      const dx = Math.abs(e.deltaX), dy = Math.abs(e.deltaY);
      const v = dx > dy ? e.deltaX : e.deltaY;
      if (Math.abs(v) < 28) return;
      lastFire = now;
      if (v > 0) navigate(Math.min(SECTIONS.length - 1, current + 1));
      else navigate(Math.max(0, current - 1));
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [current, navigate]);

  // Lock body scroll while landing page is mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = "";
    };
  }, []);

  const resolveStyle = (idx: number) => SECTIONS[idx].style;

  const sectionComponents = [
    <HomeSection key="home" onNavigate={navigate} />,
    <FeaturesSection key="features" />,
    <HowSection key="how" />,
    <WhoSection key="who" />,
    <PricingSection key="pricing" />,
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <div className="ll-root">
        <div className="ll-stage">
          {SECTIONS.map((s, i) => {
            let state: "idle" | "active" | "exiting" = "idle";
            if (i === current) state = "active";
            else if (i === previous) state = "exiting";
            let dir = direction;
            if (state === "idle") dir = (i > current ? "forward" : "back") as typeof direction;

            return (
              <div
                key={s.key}
                className="ll-slide"
                data-state={state}
                data-dir={dir}
                data-style={resolveStyle(i)}
                aria-hidden={state !== "active"}
              >
                {sectionComponents[i]}
              </div>
            );
          })}

          <LandingNav
            current={current}
            onNav={navigate}
            onLogin={() => setLoginOpen((v) => !v)}
            loginOpen={loginOpen}
            loginBtnRef={loginBtnRef}
          />
          <LoginCascade open={loginOpen} onClose={() => setLoginOpen(false)} anchor={loginBtnRef} />

          <div className="ll-progress">
            <span className="ll-num">{String(current + 1).padStart(2, "0")}</span>
            <div className="ll-track">
              <div
                className="ll-fill"
                style={{ width: ((current + 1) / SECTIONS.length) * 100 + "%" }}
              />
            </div>
            <span className="ll-num">{String(SECTIONS.length).padStart(2, "0")} · {SECTIONS[current].label}</span>
          </div>

          <div className="ll-hint">
            <kbd>←</kbd><kbd>→</kbd> or <kbd>1</kbd>–<kbd>5</kbd> to navigate · <kbd>L</kbd> sign in
          </div>
        </div>
      </div>
    </>
  );
}
