
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ExternalLink,
  MessageSquare,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DocumentPreview({ document, isOpen, onClose }) {
  if (!document) return null;

  const getCategoryIcon = (category) => {
    const icons = {
      legal: "⚖️",
      medical: "🏥",
      government: "🏛️",
      financial: "💰",
      employment: "💼",
      academic: "📚",
    };
    return icons[category] || "📄";
  };

  const getCategoryColor = (category) => {
    const colors = {
      legal: "from-red-500 to-pink-500",
      medical: "from-emerald-500 to-teal-500",
      government: "from-blue-500 to-indigo-500",
      financial: "from-yellow-500 to-orange-500",
      employment: "from-purple-500 to-violet-500",
      academic: "from-cyan-500 to-blue-500",
    };
    return colors[category] || "from-slate-500 to-gray-500";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-amber-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(document.category)} rounded-xl flex items-center justify-center shadow-sm`}>
                  <span className="text-xl">{getCategoryIcon(document.category)}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{document.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {document.category}
                    </Badge>
                    {getStatusIcon(document.processing_status)}
                    <span className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                      {document.processing_status}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-6 space-y-6">
                {/* Document Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>Uploaded: {new Date(document.created_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <FileText className="w-4 h-4" />
                    <span>Type: {document.file_type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="w-4 h-4 text-center">🌐</span>
                    <span className="capitalize">Language: {document.language}</span>
                  </div>
                </div>

                {/* Simplified Summary */}
                {document.simplified_summary && (
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-blue-900 dark:text-blue-300">AI Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {document.simplified_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Medical Severity */}
                {document.medical_severity && (
                  <Card className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-red-900 dark:text-red-300">Severity Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {document.medical_severity}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Legal Rights */}
                {document.legal_rights_summary && (
                  <Card className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-purple-900 dark:text-purple-300">Legal Rights & Laws</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {document.legal_rights_summary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Key Points */}
                {document.key_points && document.key_points.length > 0 && (
                  <Card className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-emerald-900 dark:text-emerald-300">Key Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {document.key_points.map((point, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span className="text-slate-700 dark:text-slate-300">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                 {/* Suggested Next Steps */}
                {document.suggested_next_steps && (
                  <Card className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50">
                    <CardHeader>
                      <CardTitle className="text-lg text-yellow-900 dark:text-yellow-300">Suggested Next Steps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {document.suggested_next_steps}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                <div className="flex flex-wrap gap-3">
                  {document.file_url && (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={() => window.open(document.file_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Original
                    </Button>
                  )}
                  <Link to={createPageUrl(`Chat?document=${document.id}`)}>
                    <Button className="neon-button flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Ask Questions
                    </Button>
                  </Link>
                </div>
              </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
