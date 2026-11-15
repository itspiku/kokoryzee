import {
  Home, Music2, Heart, HeartHandshake, Users, BookOpen, PenLine, Mic, MicOff, Wind, Sun, Moon, Cloud, CloudRain, CloudSun,
  CloudLightning, Footprints, TreePine, Coffee, Phone, PhoneOff, Video, VideoOff, MessageCircle, Send, Shield, ShieldCheck, Lock,
  Settings, Bell, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, X, Check, Plus, Play, Pause, Timer, Sparkles, Activity, Brain, Watch,
  Smartphone, Waves, Flame, Bird, Calendar, CalendarDays, Clock, FileText, Eye, EyeOff, Download, Trash2, Info, AlertTriangle, Mail, Sprout,
  DoorOpen, Hand, Ear, Flower2, AudioLines, Sunrise, HeartPulse, Stethoscope, ClipboardList, LineChart, Image as ImageIcon, Camera,
  Search, Share2, User, UserPlus, Star, Bookmark, ArrowRight, ArrowLeft, ArrowUpRight, Layers, Target, Zap, SlidersHorizontal,
  Volume2, VolumeX, SkipForward, Repeat, Gamepad2, Compass, MapPin, Scroll, Printer, History, Fingerprint, Server, Database,
  BadgeCheck, Gauge, TrendingUp, Palette, LogOut, Pencil, Leaf, Quote, LifeBuoy, Pill, Paperclip, MoreHorizontal, Copy, Circle,
  CircleDot, Square, Inbox, Flag, Lightbulb, UsersRound, Orbit, Scan, Link2, RefreshCw,
  CheckCheck, Hourglass, Wifi, BatteryFull, Signal, Sofa, Glasses, BellRing, HandHeart, Smile, Frown, Meh, Ruler, Crosshair,
  FlaskConical, KeyRound, FileCheck2, UserCheck, Eraser, Undo2, Rewind, FastForward, Sliders, Thermometer, LayoutGrid, Mountain, Anchor, ScrollText, Minus, CalendarPlus, CalendarCheck, Unlock, Mic2, Upload, ImagePlus, Hash, Maximize2, Cpu, Network, Radio, Fingerprint as FingerprintIcon,
} from 'lucide-react';

const MAP = {
  Home, Music2, Heart, HeartHandshake, Users, BookOpen, PenLine, Mic, MicOff, Wind, Sun, Moon, Cloud, CloudRain, CloudSun,
  CloudLightning, Footprints, TreePine, Coffee, Phone, PhoneOff, Video, VideoOff, MessageCircle, Send, Shield, ShieldCheck, Lock,
  Settings, Bell, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, X, Check, Plus, Play, Pause, Timer, Sparkles, Activity, Brain, Watch,
  Smartphone, Waves, Flame, Bird, Calendar, CalendarDays, Clock, FileText, Eye, EyeOff, Download, Trash2, Info, AlertTriangle, Mail, Sprout,
  DoorOpen, Hand, Ear, Flower2, AudioLines, Sunrise, HeartPulse, Stethoscope, ClipboardList, LineChart, Image: ImageIcon, Camera,
  Search, Share2, User, UserPlus, Star, Bookmark, ArrowRight, ArrowLeft, ArrowUpRight, Layers, Target, Zap, SlidersHorizontal,
  Volume2, VolumeX, SkipForward, Repeat, Gamepad2, Compass, MapPin, Scroll, Printer, History, Fingerprint, Server, Database,
  BadgeCheck, Gauge, TrendingUp, Palette, LogOut, Pencil, Leaf, Quote, LifeBuoy, Pill, Paperclip, MoreHorizontal, Copy, Circle,
  CircleDot, Square, Inbox, Flag, Lightbulb, UsersRound, Orbit, Scan, Link2, RefreshCw, CheckCheck, Hourglass, Wifi, BatteryFull,
  Signal, Sofa, Glasses, BellRing, HandHeart, Smile, Frown, Meh, Ruler, Crosshair, FlaskConical, KeyRound, FileCheck2, UserCheck,
  Eraser, Undo2, Rewind, FastForward, Sliders, Thermometer, LayoutGrid, Mountain, Anchor, ScrollText, Minus, CalendarPlus, CalendarCheck, Unlock, Mic2, Upload, ImagePlus, Hash, Maximize2, Cpu, Network, Radio,
};

export function Icon({ name, size = 22, stroke = 1.9, className, style, ...rest }) {
  const C = MAP[name] || Circle;
  return <C size={size} strokeWidth={stroke} className={className} style={style} aria-hidden="true" {...rest} />;
}
export default Icon;
