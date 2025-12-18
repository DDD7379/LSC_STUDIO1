import { useState, useEffect } from 'react';
import {
  MessageSquare,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  EyeOff,
  LogOut,
  Filter,
  Search,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  Tabs,
  AlertCircle,
  Star
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import {
  getSubmissions,
  markAsRead,
  markAsUnread,
  deleteSubmission,
  clearAllSubmissions,
  getUnreadCount,
  setAdminAuthenticated,
  isAdminAuthenticated,
  updateSubmissionAIReview
} from '../utils/storage';
import type { Submission, ContactForm, StaffApplicationForm, AIReview } from '../types';

export default function AdminDashboard() {
  const { navigateTo } = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tab, setTab] = useState<'support' | 'staff'>('staff');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigateTo('admin-login');
      return;
    }
    loadSubmissions();
  }, []);

  const generateAIReview = async (submission: Submission) => {
    if (submission.aiReview) return;

    setLoadingReview(true);
    try {
      // רק למועמדויות צוות
      if (submission.type !== 'staff-application') {
        alert('ביקורת זמינה רק למועמדויות צוות');
        setLoadingReview(false);
        return;
      }

      const data = submission.data as StaffApplicationForm;
      const highlights: string[] = [];
      let score = 10; // מתחילים עם 10 נקודות

      // פונקציה עזר להמרת שעות ביום
      function parseHoursPerDay(hoursValue: string): number {
        if (hoursValue === '0.5-1') return 0.75;
        if (hoursValue === '1-2') return 1.5;
        if (hoursValue === '3-4') return 3.5;
        if (hoursValue === '5+') return 5;
        return 0;
      }

      // בדיקת אורך התשובות - סיכום כללי בלבד
      const minLength = 50;
      const requiredFields = [
        { value: data.experience, name: 'ניסיון קודם' },
        { value: data.motivation, name: 'מוטיבציה' },
        { value: data.scenario, name: 'תרחיש דוגמה' },
      ];

      // בדיקה כמה תשובות קצרות
      let shortCount = 0;
      let emptyCount = 0;
      let totalLength = 0;
      
      requiredFields.forEach((field) => {
        const length = (field.value || '').trim().length;
        totalLength += length;
        if (length === 0) {
          emptyCount++;
          score -= 3; // עונש גדול יותר על תשובות חסרות
        } else if (length < minLength) {
          shortCount++;
          score -= 2; // עונש גדול יותר על תשובות קצרות
        }
      });

      // בדיקת קישורים בניסיון קודם
      const experienceText = (data.experience || '').trim();
      if (experienceText.length > 0) {
        // בדיקה מדויקת יותר לקישורים - מחפש קישורים בפועל
        const hasHttpLinks = /https?:\/\//i.test(experienceText);
        const hasDiscordLink = /discord\.gg\/[\w-]+/i.test(experienceText) || 
                              /discord\.com\/[\w-]+/i.test(experienceText) ||
                              /discord\.gg/i.test(experienceText);
        const hasRobloxLink = /roblox\.com\/[\w-]+/i.test(experienceText) || 
                             /roblox\.com\/games\/\d+/i.test(experienceText) ||
                             /roblox\.com/i.test(experienceText);
        const hasWwwLink = /www\.\w+\.\w+/i.test(experienceText);
        // בדיקה גם לקישורים בלי http
        const hasDomainLink = /\w+\.(com|gg|net|org|io)\/?/i.test(experienceText);
        
        const hasLinks = hasHttpLinks || hasDiscordLink || hasRobloxLink || hasWwwLink || hasDomainLink;
        
        if (!hasLinks) {
          highlights.push('⚠️ לא סיפק קישורים בניסיון קודם');
          score -= 1.5;
        }
      }

      // בדיקת פרטים נוספים
      if (data.additionalInfo && data.additionalInfo.trim().length > 0) {
        highlights.push('✅ הוסיף פרטים נוספים');
      }

      // סיכום כללי בלבד - בלי פירוט
      if (emptyCount > 0) {
        highlights.push('❌ תשובות חסרות');
      } else if (shortCount === requiredFields.length) {
        highlights.push('❌ תשובות קצרות מאוד');
      } else if (shortCount > 0) {
        highlights.push('⚠️ תשובות קצרות חלקית');
      } else if (totalLength > 1000) {
        highlights.push('✅ תשובות מפורטות');
      }

      // בדיקת שעות זמינות ביום
      if (data.weeklyHours) {
        const hoursPerDay = parseHoursPerDay(data.weeklyHours);
        if (hoursPerDay >= 2) {
          highlights.push('✅ זמינות טובה');
        } else if (hoursPerDay >= 1) {
          highlights.push('⚠️ זמינות בינונית');
          score -= 0.5;
        } else {
          highlights.push('⚠️ זמינות נמוכה');
          score -= 1;
        }
      }

      // בדיקת נוכחות כל השדות
      const requiredFormFields = [
        { name: 'שם מלא', value: data.fullName },
        { name: 'דיסקורד', value: data.discordUsername },
        { name: 'רובלוקס', value: data.robloxUsername },
        { name: 'תפקיד מבוקש', value: data.position },
        { name: 'אזור זמן', value: data.timezone },
      ];

      const missingFields = requiredFormFields.filter((f) => !f.value || f.value.trim().length === 0);
      if (missingFields.length > 0) {
        score -= missingFields.length * 0.5;
        highlights.push(`⚠️ שדות חסרים: ${missingFields.map((f) => f.name).join(', ')}`);
      }

      // הגבלת הציון ל-1-10
      score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

      // יצירת הביקורת
      const review: AIReview = {
        score,
        highlights: highlights.length > 0 ? highlights : ['✓ כל השדות מולאו'],
      };

      await updateSubmissionAIReview(submission.id, review);
      
      const updatedSubmission = { ...submission, aiReview: review };
      const updatedSubmissions = submissions.map((s: Submission) =>
        s.id === submission.id ? updatedSubmission : s
      );
      setSubmissions(updatedSubmissions);
      setSelectedSubmission(updatedSubmission);
    } catch (error) {
      console.error('Error generating review:', error);
      alert(`שגיאה בביקורת: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setLoadingReview(false);
    }
  };

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getSubmissions();
      setSubmissions(data);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    navigateTo('admin-login');
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    await loadSubmissions();
  };

  const handleMarkAsUnread = async (id: string) => {
    await markAsUnread(id);
    await loadSubmissions();
  };

  const handleDelete = async (id: string) => {
    if (confirm('האם אתם בטוחים שברצונכם למחוק את הפנייה הזו?')) {
      await deleteSubmission(id);
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
      await loadSubmissions();
    }
  };

  const handleClearAll = async () => {
    if (confirm('האם אתם בטוחים שברצונכם למחוק את כל הפניות? פעולה זו לא ניתנת לביטול.')) {
      await clearAllSubmissions();
      await loadSubmissions();
      setSelectedSubmission(null);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    if (filter === 'unread' && submission.read) return false;
    if (tab === 'support' && submission.type !== 'support') return false;
    if (tab === 'staff' && submission.type !== 'staff-application') return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const data = submission.data;
      if (submission.type === 'support') {
        const contact = data as ContactForm;
        return (
          contact.name.toLowerCase().includes(searchLower) ||
          contact.message.toLowerCase().includes(searchLower) ||
          contact.contactMethod.toLowerCase().includes(searchLower)
        );
      } else {
        const staff = data as StaffApplicationForm;
        return (
          staff.fullName.toLowerCase().includes(searchLower) ||
          staff.discordUsername.toLowerCase().includes(searchLower) ||
          staff.robloxUsername.toLowerCase().includes(searchLower) ||
          staff.position.toLowerCase().includes(searchLower)
        );
      }
    }
    return true;
  });

  const supportCount = submissions.filter(s => s.type === 'support').length;
  const staffCount = submissions.filter(s => s.type === 'staff-application').length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">פאנל ניהול</h1>
              <p className="text-gray-400">ניהול כל הפניות והמועמדויות</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadSubmissions}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2"
                title="רענן"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                התנתק
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-700">
            <button
              onClick={() => { setTab('staff'); setFilter('all'); }}
              className={`px-6 py-3 font-bold text-lg transition-all duration-200 border-b-2 ${
                tab === 'staff'
                  ? 'text-blue-400 border-b-blue-400'
                  : 'text-gray-400 border-b-transparent hover:text-gray-300'
              }`}
            >
              <UserCheck className="w-5 h-5 inline mr-2" />
              מועמדויות צוות ({staffCount})
            </button>
            <button
              onClick={() => { setTab('support'); setFilter('all'); }}
              className={`px-6 py-3 font-bold text-lg transition-all duration-200 border-b-2 ${
                tab === 'support'
                  ? 'text-blue-400 border-b-blue-400'
                  : 'text-gray-400 border-b-transparent hover:text-gray-300'
              }`}
            >
              <Mail className="w-5 h-5 inline mr-2" />
              פניות תמיכה ({supportCount})
            </button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold text-white">{filteredSubmissions.length}</span>
              </div>
              <p className="text-gray-300 text-sm">סה"כ {tab === 'staff' ? 'מועמדויות' : 'פניות'}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-600/20 to-orange-700/20 backdrop-blur-sm p-6 rounded-xl border border-orange-500/30">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-400" />
                <span className="text-2xl font-bold text-white">{filteredSubmissions.filter(s => !s.read).length}</span>
              </div>
              <p className="text-gray-300 text-sm">לא נקראו</p>
            </div>
            <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 backdrop-blur-sm p-6 rounded-xl border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <span className="text-2xl font-bold text-white">{filteredSubmissions.filter(s => s.read).length}</span>
              </div>
              <p className="text-gray-300 text-sm">נקראו</p>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`חפש ${tab === 'staff' ? 'במועמדויות' : 'בפניות'}...`}
                  className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors text-right"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'unread'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                      filter === filterType
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {filterType === 'all' && 'הכל'}
                    {filterType === 'unread' && 'לא נקראו'}
                  </button>
                ))}
              </div>
              {filteredSubmissions.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  מחק הכל
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">
                  פניות ({filteredSubmissions.length})
                </h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">טוען...</p>
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">אין פניות להצגה</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {filteredSubmissions.map((submission) => {
                      const isSupport = submission.type === 'support';
                      const data = submission.data as ContactForm | StaffApplicationForm;
                      
                      return (
                        <div
                          key={submission.id}
                          onClick={() => setSelectedSubmission(submission)}
                          className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-700/50 ${
                            !submission.read ? 'bg-blue-900/20 border-r-4 border-blue-500' : ''
                          } ${selectedSubmission?.id === submission.id ? 'bg-gray-700/70' : ''}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isSupport ? (
                                <Mail className="w-5 h-5 text-purple-400" />
                              ) : (
                                <UserCheck className="w-5 h-5 text-green-400" />
                              )}
                              <span className={`text-sm font-semibold ${
                                isSupport ? 'text-purple-400' : 'text-green-400'
                              }`}>
                                {isSupport ? 'תמיכה' : 'מועמדות צוות'}
                              </span>
                              {!submission.read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {formatDate(submission.timestamp)}
                              </span>
                            </div>
                          </div>
                          <h3 className="text-white font-bold mb-1">
                            {isSupport 
                              ? (data as ContactForm).name 
                              : (data as StaffApplicationForm).fullName}
                          </h3>
                          <p className="text-gray-400 text-sm line-clamp-2">
                            {isSupport
                              ? (data as ContactForm).message
                              : `תפקיד: ${(data as StaffApplicationForm).position}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submission Details */}
          <div className="lg:col-span-1">
            {selectedSubmission ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 sticky top-24 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">פרטים</h2>
                  <div className="flex gap-2">
                    {selectedSubmission.read ? (
                      <button
                        onClick={() => {
                          handleMarkAsUnread(selectedSubmission.id);
                        }}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        title="סמן כלא נקרא"
                      >
                        <EyeOff className="w-4 h-4 text-gray-300" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleMarkAsRead(selectedSubmission.id);
                        }}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        title="סמן כנקרא"
                      >
                        <Eye className="w-4 h-4 text-gray-300" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedSubmission.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedSubmission.type === 'staff-application' && (
                    <div>
                      {selectedSubmission.aiReview ? (
                        <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 p-4 rounded-lg border border-yellow-700/50">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                              <Star className="w-5 h-5" />
                              בדיקת טופס AI
                            </h3>
                            <span className="text-2xl font-bold text-yellow-400">{selectedSubmission.aiReview.score}/10</span>
                          </div>
                          {selectedSubmission.aiReview.highlights.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold text-yellow-300 mb-2">דגשים:</h4>
                              <ul className="space-y-1">
                                {selectedSubmission.aiReview.highlights.map((highlight, i) => (
                                  <li key={i} className="text-sm text-yellow-200 flex items-start gap-2">
                                    <span className="text-yellow-500 mt-0.5">•</span>
                                    <span>{highlight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => generateAIReview(selectedSubmission)}
                          disabled={loadingReview}
                          className="w-full px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {loadingReview ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>בודק...</span>
                            </>
                          ) : (
                            <>
                              <Star className="w-5 h-5" />
                              <span>טען ביקורת AI</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedSubmission.timestamp)}
                  </div>

                  {selectedSubmission.type === 'support' ? (
                    <div className="space-y-4">
                      <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                        <h3 className="text-blue-400 font-bold text-sm mb-3 uppercase tracking-wide">פרטי יצירת קשר</h3>
                        <div className="space-y-3">
                          {(selectedSubmission.data as ContactForm).name && (
                            <div>
                              <label className="text-gray-400 text-xs font-semibold block mb-1">שם</label>
                              <p className="text-white font-semibold break-words">{(selectedSubmission.data as ContactForm).name}</p>
                            </div>
                          )}
                          {(selectedSubmission.data as ContactForm).contactMethod && (
                            <div>
                              <label className="text-gray-400 text-xs font-semibold block mb-1">אמצעי יצירת קשר</label>
                              <p className="text-white break-words">{(selectedSubmission.data as ContactForm).contactMethod}</p>
                            </div>
                          )}
                          {(selectedSubmission.data as ContactForm).contactDetails && (
                            <div>
                              <label className="text-gray-400 text-xs font-semibold block mb-1">פרטי יצירת קשר</label>
                              <p className="text-white break-words">{(selectedSubmission.data as ContactForm).contactDetails}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {(selectedSubmission.data as ContactForm).message && (
                        <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                          <label className="text-gray-400 text-xs font-semibold block mb-2 uppercase tracking-wide">הודעה</label>
                          <p className="text-white whitespace-pre-wrap break-words bg-gray-800/50 p-3 rounded-lg text-sm leading-relaxed">
                            {(selectedSubmission.data as ContactForm).message}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* פרטים אישיים */}
                      <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                        <h3 className="text-blue-400 font-bold text-sm mb-3 uppercase tracking-wide">פרטים אישיים</h3>
                        <div className="space-y-3">
                          {(selectedSubmission.data as StaffApplicationForm).fullName && (
                            <div>
                              <label className="text-gray-400 text-xs font-semibold block mb-1">שם מלא</label>
                              <p className="text-white font-semibold break-words">{(selectedSubmission.data as StaffApplicationForm).fullName}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            {(selectedSubmission.data as StaffApplicationForm).age && (
                              <div>
                                <label className="text-gray-400 text-xs font-semibold block mb-1">גיל</label>
                                <p className="text-white break-words">{(selectedSubmission.data as StaffApplicationForm).age}</p>
                              </div>
                            )}
                            {(selectedSubmission.data as StaffApplicationForm).timezone && (
                              <div>
                                <label className="text-gray-400 text-xs font-semibold block mb-1">אזור זמן</label>
                                <p className="text-white break-words">{(selectedSubmission.data as StaffApplicationForm).timezone}</p>
                              </div>
                            )}
                          </div>
                          {(selectedSubmission.data as StaffApplicationForm).discordUsername && (
                            <div>
                              <label className="text-gray-400 text-xs font-semibold block mb-1">דיסקורד</label>
                              <p className="text-white break-words">{(selectedSubmission.data as StaffApplicationForm).discordUsername}</p>
                            </div>
                          )}
                          {(selectedSubmission.data as StaffApplicationForm).robloxUsername && (
                            <div>
                              <label className="text-gray-400 text-xs font-semibold block mb-1">רובלוקס</label>
                              <p className="text-white break-words">{(selectedSubmission.data as StaffApplicationForm).robloxUsername}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* פרטי המועמדות */}
                      <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                        <h3 className="text-blue-400 font-bold text-sm mb-3 uppercase tracking-wide">פרטי המועמדות</h3>
                        <div className="space-y-3">
                          {(selectedSubmission.data as StaffApplicationForm).position && (
                            <div>
                              <label className="text-gray-400 text-xs font-semibold block mb-1">תפקיד מבוקש</label>
                              <p className="text-white font-semibold break-words">{(selectedSubmission.data as StaffApplicationForm).position}</p>
                            </div>
                          )}
                          {(selectedSubmission.data as StaffApplicationForm).weeklyHours && (
                            <div>
                              <label className="text-gray-400 text-xs font-semibold block mb-1">כמה שעות ביום תוכלו להקדיש? </label>
                              <p className="text-white break-words">{(selectedSubmission.data as StaffApplicationForm).weeklyHours}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ניסיון קודם */}
                      {(selectedSubmission.data as StaffApplicationForm).experience && (
                        <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                          <label className="text-gray-400 text-xs font-semibold block mb-2 uppercase tracking-wide">ניסיון קודם בתפקידי צוות</label>
                          <p className="text-white whitespace-pre-wrap break-words bg-gray-800/50 p-3 rounded-lg text-sm leading-relaxed">
                            {(selectedSubmission.data as StaffApplicationForm).experience}
                          </p>
                        </div>
                      )}

                      {/* מוטיבציה */}
                      {(selectedSubmission.data as StaffApplicationForm).motivation && (
                        <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                          <label className="text-gray-400 text-xs font-semibold block mb-2 uppercase tracking-wide">למה אתם רוצים להצטרף לצוות? *
</label>
                          <p className="text-white whitespace-pre-wrap break-words bg-gray-800/50 p-3 rounded-lg text-sm leading-relaxed">
                            {(selectedSubmission.data as StaffApplicationForm).motivation}
                          </p>
                        </div>
                      )}

                      {/* תרחיש דוגמה */}
                      {(selectedSubmission.data as StaffApplicationForm).scenario && (
                        <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                          <label className="text-gray-400 text-xs font-semibold block mb-2 uppercase tracking-wide">איך הייתם מטפלים בסכסוך בין שני שחקנים</label>
                          <p className="text-white whitespace-pre-wrap break-words bg-gray-800/50 p-3 rounded-lg text-sm leading-relaxed">
                            {(selectedSubmission.data as StaffApplicationForm).scenario}
                          </p>
                        </div>
                      )}

                      {/* מידע נוסף */}
                      {(selectedSubmission.data as StaffApplicationForm).additionalInfo && (
                        <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/50">
                          <label className="text-gray-400 text-xs font-semibold block mb-2 uppercase tracking-wide">מידע נושא שתרצו לשתף</label>
                          <p className="text-white whitespace-pre-wrap break-words bg-gray-800/50 p-3 rounded-lg text-sm leading-relaxed">
                            {(selectedSubmission.data as StaffApplicationForm).additionalInfo}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-8 text-center">
                <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">בחרו פנייה כדי לראות פרטים</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

