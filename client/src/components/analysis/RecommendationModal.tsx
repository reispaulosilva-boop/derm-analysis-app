
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, FileText, CheckCircle2, AlertCircle, ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/services/recommendationService";

interface RecommendationModalProps {
    isOpen: boolean;
    onClose: () => void;
    recommendations: Recommendation[];
}

export function RecommendationModal({ isOpen, onClose, recommendations }: RecommendationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-card border border-primary/20 rounded-2xl shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-secondary/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                Plano de Tratamento
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Sugestões baseadas na análise SkinScope
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {recommendations.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-80" />
                            <h3 className="text-lg font-medium">Pele Saudável!</h3>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                Não detectamos prioridades críticas de tratamento com base nos parâmetros atuais.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {recommendations.map((rec) => (
                                <div
                                    key={rec.id}
                                    className={`relative p-5 rounded-xl border ${rec.priority === "high"
                                            ? "bg-primary/5 border-primary/30"
                                            : "bg-card border-border/60"
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${rec.type === "procedure"
                                                    ? "bg-blue-500/10 text-blue-500"
                                                    : "bg-purple-500/10 text-purple-500"
                                                }`}
                                        >
                                            {rec.type === "procedure" ? (
                                                <Zap className="w-5 h-5" />
                                            ) : (
                                                <ShoppingBag className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-foreground text-lg leading-tight">
                                                    {rec.title}
                                                </h3>
                                                {rec.priority === "high" && (
                                                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">
                                                        Prioridade
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {rec.description}
                                            </p>

                                            {rec.tags && (
                                                <div className="flex gap-2 mt-3">
                                                    {rec.tags.map(tag => (
                                                        <span key={tag} className="text-[10px] px-2 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-md flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                        <FileText className="w-4 h-4" />
                        Salvar no Prontuário
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
