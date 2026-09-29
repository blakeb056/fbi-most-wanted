"use client";

import React from "react";
import { Fugitive } from "@/lib/types";
import {
  X,
  AlertTriangle,
  FileText,
  ExternalLink,
  MapPin,
  User,
  Shield,
  Award,
} from "lucide-react";

interface FugitiveDossierProps {
  fugitive: Fugitive | null;
  onClose: () => void;
  onLocateOnGlobe?: (fugitive: Fugitive) => void;
}

export default function FugitiveDossier({
  fugitive,
  onClose,
  onLocateOnGlobe,
}: FugitiveDossierProps) {
  if (!fugitive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono text-neutral-200">
        {/* Classified Header Stamp */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                  FBI WANTED DOSSIER
                </span>
                <span className="text-[11px] text-neutral-500">
                  CASE UID: {fugitive.uid.substring(0, 12)}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white tracking-wide mt-0.5">
                {fugitive.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner if Armed and Dangerous */}
        {fugitive.warning_message && (
          <div className="bg-red-600/90 text-white px-6 py-2.5 flex items-center justify-center gap-2 text-xs md:text-sm font-bold uppercase tracking-wider text-center">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{fugitive.warning_message}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Section: Mugshot & Core Reward */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Mugshot Image Gallery */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <div className="relative aspect-[4/5] bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-xl">
                <img
                  src={fugitive.images[0]?.large || fugitive.images[0]?.thumb}
                  alt={fugitive.title}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              {fugitive.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {fugitive.images.slice(1, 5).map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900"
                    >
                      <img src={img.thumb || img.large} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Intelligence Summary */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              {/* Reward Callout */}
              <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">
                  <Award className="w-4 h-4" />
                  Federal Bounty Reward
                </div>
                <div className="text-3xl md:text-4xl font-black text-amber-400">
                  {fugitive.reward_formatted}
                </div>
                {fugitive.reward_text && (
                  <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                    {fugitive.reward_text}
                  </p>
                )}
              </div>

              {/* Aliases */}
              {fugitive.aliases && fugitive.aliases.length > 0 && (
                <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-1">
                    Known Aliases / Monikers
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {fugitive.aliases.map((alias, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 text-xs font-semibold"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Geographic Tracking Coordinates */}
              {(fugitive.crime_location || fugitive.escape_location) && (
                <div className="grid grid-cols-2 gap-3 bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 text-xs">
                  {fugitive.crime_location && (
                    <div>
                      <span className="text-[10px] text-red-400 uppercase tracking-widest block mb-0.5">
                        Crime / Origin
                      </span>
                      <p className="font-semibold text-white flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        {fugitive.crime_location.name}
                      </p>
                    </div>
                  )}
                  {fugitive.escape_location && (
                    <div>
                      <span className="text-[10px] text-amber-400 uppercase tracking-widest block mb-0.5">
                        Suspected Haven
                      </span>
                      <p className="font-semibold text-white flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        {fugitive.escape_location.name}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Crime Description */}
              {fugitive.description && (
                <div className="bg-neutral-900/40 p-3.5 rounded-xl border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-1">
                    Alleged Offense Summary
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans font-medium">
                    {fugitive.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Physical Description Table */}
          <div>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-neutral-500" />
              Physical Characteristics & Identifiers
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase">Sex</span>
                <span className="font-bold text-white">{fugitive.sex || "Unknown"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase">Race</span>
                <span className="font-bold text-white">{fugitive.race || "Unknown"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase">Hair</span>
                <span className="font-bold text-white">{fugitive.hair || "Unknown"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase">Eyes</span>
                <span className="font-bold text-white">{fugitive.eyes || "Unknown"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase">Height</span>
                <span className="font-bold text-white">
                  {fugitive.height_min ? `${fugitive.height_min}"` : "Unknown"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase">Weight</span>
                <span className="font-bold text-white">{fugitive.weight || "Unknown"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase">Date of Birth</span>
                <span className="font-bold text-white">
                  {fugitive.dates_of_birth_used?.[0] || "Unknown"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase">Place of Birth</span>
                <span className="font-bold text-white line-clamp-1">
                  {fugitive.place_of_birth || "Unknown"}
                </span>
              </div>
            </div>

            {fugitive.scars_and_marks && (
              <div className="mt-2.5 p-3 rounded-lg bg-neutral-900/80 border border-neutral-800/80 text-xs">
                <span className="text-[10px] text-neutral-500 block uppercase mb-0.5">
                  Scars, Marks & Tattoos
                </span>
                <p className="text-neutral-300">{fugitive.scars_and_marks}</p>
              </div>
            )}
          </div>

          {/* Full Narrative Caution */}
          {fugitive.caution && (
            <div>
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                Investigative Caution Narrative
              </h3>
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 leading-relaxed font-sans">
                {fugitive.caution}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-neutral-900 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {fugitive.files?.[0]?.url && (
              <a
                href={fugitive.files[0].url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-lg"
              >
                <FileText className="w-4 h-4" /> Download Official FBI Poster (PDF)
              </a>
            )}
            <a
              href={fugitive.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View on FBI.gov
            </a>
          </div>

          {onLocateOnGlobe && fugitive.crime_location && (
            <button
              onClick={() => {
                onLocateOnGlobe(fugitive);
                onClose();
              }}
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-xs font-bold py-2 px-4 rounded-xl transition-colors"
            >
              <MapPin className="w-4 h-4 text-red-500" /> Locate on 3D Globe
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
