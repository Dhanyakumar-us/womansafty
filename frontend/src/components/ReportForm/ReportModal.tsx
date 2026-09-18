import React, { useState } from 'react';
import { FileText, MapPin, Camera, Lock, Send, ExternalLink, CheckCircle2, ShieldAlert } from 'lucide-react';
import { submitCommunityReport } from '../../services/api';

interface ReportModalProps {
  userLocation: { lat: number; lng: number } | null;
  onOpenPinPicker: () => void;
  selectedMapPin: { lat: number; lng: number } | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  userLocation,
  onOpenPinPicker,
  selectedMapPin
}) => {
  const [incidentType, setIncidentType] = useState('Verbal Harassment');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const targetLat = selectedMapPin ? selectedMapPin.lat : userLocation ? userLocation.lat : 28.6315;
  const targetLng = selectedMapPin ? selectedMapPin.lng : userLocation ? userLocation.lng : 77.2167;

  const incidentTypes = [
    'Verbal Harassment',
    'Stalking & Following',
    'Poor Lighting',
    'Suspicious Activity',
    'Physical Assault',
    'Robbery & Snatching'
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please enter a description of the incident.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await submitCommunityReport({
        lat: targetLat,
        lng: targetLng,
        type: incidentType,
        description,
        photoUrl: photoUrl || undefined,
        isAnonymous
      });

      setSubmitSuccess(true);
      setDescription('');
      setPhotoUrl(null);
    } catch (err) {
      setErrorMsg('Failed to submit report. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-2">
          <FileText className="w-6 h-6 text-rose-400" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Report Safety Incident</h2>
        <p className="text-xs text-slate-400 mt-1">
          Help protect women in your community. Reports appear on the crime heat map upon submission.
        </p>
      </div>

      {submitSuccess ? (
        <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-extrabold text-white">Report Submitted!</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your community safety report has been added to the SafeWalk heatmap dataset.
          </p>
          <button
            onClick={() => setSubmitSuccess(false)}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
          >
            Submit Another Incident
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-4 shadow-xl">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Incident Type Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Incident Category</label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full py-3 px-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {incidentTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Location Pin */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Location</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 truncate">
                Lat: {targetLat.toFixed(4)}, Lng: {targetLng.toFixed(4)}
              </div>
              <button
                type="button"
                onClick={onOpenPinPicker}
                className="py-2.5 px-3 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 hover:bg-rose-600/30 text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <MapPin className="w-4 h-4" />
                Pick on Map
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Incident Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened (e.g. unlit road, suspicious individuals loitering, catcalling)..."
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          {/* Optional Photo Attachment */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Optional Photo Evidence</label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-2">
                <Camera className="w-4 h-4 text-rose-400" />
                {photoUrl ? 'Change Photo' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              {photoUrl && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-rose-500/50">
                  <img src={photoUrl} alt="Incident preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-slate-200">Submit Anonymously</div>
                <div className="text-[10px] text-slate-400">Protects your identity & privacy</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Incident Report
              </>
            )}
          </button>
        </form>
      )}

      {/* Official Police & Cybercrime Portal Banner */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-700/80 space-y-2">
        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          File Official Cybercrime or Police Complaint
        </h4>
        <p className="text-[11px] text-slate-400 leading-snug">
          To file a formal legal report with national law enforcement authorities, visit the official government portals below:
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-bold text-sky-400 hover:bg-slate-800 flex items-center justify-center gap-1.5"
          >
            National Cyber Crime <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://112.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-bold text-rose-400 hover:bg-slate-800 flex items-center justify-center gap-1.5"
          >
            Emergency 112 Portal <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
