import React, { useState } from 'react';
import { Settings, UserPlus, Trash2, Volume2, ShieldCheck, Lock, PhoneCall, Check, Info } from 'lucide-react';
import { UserSettings, EmergencyContact } from '../../types';
import { sirenService } from '../../services/audioSiren';

interface SettingsModalProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      phone: newContactPhone.trim()
    };

    onUpdateSettings({
      ...settings,
      emergencyContacts: [...settings.emergencyContacts, newContact]
    });

    setNewContactName('');
    setNewContactPhone('');
  };

  const handleRemoveContact = (id: string) => {
    onUpdateSettings({
      ...settings,
      emergencyContacts: settings.emergencyContacts.filter(c => c.id !== id)
    });
  };

  const toggleTestSiren = () => {
    if (isTestingAudio) {
      sirenService.stopSiren();
      setIsTestingAudio(false);
    } else {
      sirenService.startSiren(settings.alarmVolume);
      setIsTestingAudio(true);
      setTimeout(() => {
        sirenService.stopSiren();
        setIsTestingAudio(false);
      }, 3000); // test for 3 seconds
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="p-4 pb-24 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-2">
          <Settings className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Safety & Privacy Settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage emergency contacts, helpline numbers, alarm volume, and PIN lock.
        </p>
      </div>

      {/* Emergency Contacts Manager */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-4 shadow-xl">
        <h3 className="text-sm font-extrabold text-white flex items-center justify-between">
          <span>Emergency Contacts ({settings.emergencyContacts.length})</span>
          <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            Auto SMS / Share
          </span>
        </h3>

        {/* Existing Contacts List */}
        <div className="space-y-2">
          {settings.emergencyContacts.map((contact) => (
            <div key={contact.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-100">{contact.name}</div>
                <div className="text-[11px] text-slate-400 font-medium">{contact.phone}</div>
              </div>
              <button
                onClick={() => handleRemoveContact(contact.id)}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-all"
                title="Remove Contact"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {settings.emergencyContacts.length === 0 && (
            <div className="p-3 rounded-xl bg-slate-900/50 border border-dashed border-slate-700 text-center text-xs text-slate-500">
              No emergency contacts added yet. Add trusted contacts below.
            </div>
          )}
        </div>

        {/* Add Contact Form */}
        <form onSubmit={handleAddContact} className="pt-2 border-t border-slate-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Contact Name"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4 text-rose-400" />
            Add Emergency Contact
          </button>
        </form>
      </div>

      {/* Configurable Helplines & Audio Settings */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-4 shadow-xl">
        <h3 className="text-sm font-extrabold text-white">Helplines & Alarm Volume</h3>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Primary (112)</label>
            <input
              type="text"
              value={settings.primaryHelpline}
              onChange={(e) => onUpdateSettings({ ...settings, primaryHelpline: e.target.value })}
              className="w-full py-2 px-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold text-center"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Women (1091)</label>
            <input
              type="text"
              value={settings.womenHelpline}
              onChange={(e) => onUpdateSettings({ ...settings, womenHelpline: e.target.value })}
              className="w-full py-2 px-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold text-center"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Distress (181)</label>
            <input
              type="text"
              value={settings.distressHelpline}
              onChange={(e) => onUpdateSettings({ ...settings, distressHelpline: e.target.value })}
              className="w-full py-2 px-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold text-center"
            />
          </div>
        </div>

        {/* Volume Slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-rose-400" />
              Siren Alarm Volume ({Math.round(settings.alarmVolume * 100)}%)
            </label>
            <button
              type="button"
              onClick={toggleTestSiren}
              className="text-[10px] font-bold text-rose-400 underline"
            >
              {isTestingAudio ? 'Testing (3s)...' : 'Test Siren'}
            </button>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={settings.alarmVolume}
            onChange={(e) => onUpdateSettings({ ...settings, alarmVolume: parseFloat(e.target.value) })}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>

        {/* PIN Setup */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Siren Deactivation PIN</div>
            <div className="text-[10px] text-slate-400">Prevents attacker from stopping alarm</div>
          </div>
          <input
            type="text"
            maxLength={4}
            value={settings.sirenPin}
            onChange={(e) => onUpdateSettings({ ...settings, sirenPin: e.target.value })}
            className="w-16 py-1.5 px-2 rounded-xl bg-slate-900 border border-slate-700 text-center font-bold text-sm text-white"
          />
        </div>
      </div>

      {/* Location Permission Explainer & Privacy Policy */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-700/80 space-y-2 shadow-xl">
        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-sky-400" />
          Location Permission Explainer & Privacy
        </h4>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          SafeWalk requests precise location access (<code className="text-rose-400 font-mono">watchPosition</code>) strictly to calculate safest walking routes and pinpoint distress location for emergency SMS alerts. Your location data is kept locally on your device and is never stored on external tracking servers without your explicit action.
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 border border-slate-700 shadow-xl"
      >
        {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4 text-amber-400" />}
        {isSaved ? 'Settings Saved!' : 'Save Safety Preferences'}
      </button>
    </div>
  );
};
