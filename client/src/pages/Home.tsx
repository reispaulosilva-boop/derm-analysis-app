/**
 * SkinScope Home Page (Polished)
 * Design: "SkinScope" — Instrumento Digital Moderno
 * Dark theme, mobile-first, teal accents, medical device aesthetic
 * Optimized for iPhone 15 Pro + Apple TV mirroring
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, GitCompareArrows, Microscope, Sparkles, User, Calendar, ChevronRight, Plus } from "lucide-react";
import { Link } from "wouter";
import { patientService, type Patient } from "@/services/patientService";
import { Button } from "@/components/ui/button";

const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/D0eebaAmMDu8mMPNeWB9fh/sandbox/jnT79cpuXnb0r53R856YPM-img-1_1771357251000_na1fn_aGVyby1iZy1kYXJr.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvRDBlZWJhQW1NRHU4bU1QTmVXQjlmaC9zYW5kYm94L2puVDc5Y3B1WG5iMHI1M1I4NTZZUE0taW1nLTFfMTc3MTM1NzI1MTAwMF9uYTFmbl9hR1Z5YnkxaVp5MWtZWEpyLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=uykgRqD-UfOrBfNXLPrsLlIGefMDMgyfTP~ojWNH9CtuKG5zToHlL63xXz1Bhh0exukv7RHhNVJwp64ZmDONDcjSjBJ90D1PDLPwOm5jmZhNkbAisWYFyCPI~hcUqsOmlrOXvynfERNMr4CHJ5Q0eC2zgdQ9IuGr-caolEPw0uwB7RLsw0rT7KKcazFklfFu~mXLeabL35yjLEdp58WW1WlKC93REWMBDSIbBD37obIl4D0sh3CiMmmZ2zwMqzlncS7XHFtUJQ9lyibO1r4XChUY30~yiCW2Jy1Ri1poSpulZlbNjZF0Eg9~QHopEHTW2iY51KK~~A98xekR6DUw5Q__";

const ANALYSIS_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/D0eebaAmMDu8mMPNeWB9fh/sandbox/jnT79cpuXnb0r53R856YPM-img-2_1771357257000_na1fn_c2tpbi1hbmFseXNpcy1vdmVybGF5.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvRDBlZWJhQW1NRHU4bU1QTmVXQjlmaC9zYW5kYm94L2puVDc5Y3B1WG5iMHI1M1I4NTZZUE0taW1nLTJfMTc3MTM1NzI1NzAwMF9uYTFmbl9jMnRwYmkxaGJtRnNlWE5wY3kxdmRtVnliR0Y1LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=PFEO6qY1JxR~69~KUgvOMQmcRSWVgNWGDrJ9zwmp01kJRSJheBgFpKWPGxJ~iXo41KUhCAXKKTc5AfLI0Az312REM8O5ZQOcWeBj3Cv9~FUwIxz41bkFvPX3a7tr9Tkm6iItxZEhoM0-~dW-hLDqqzyj-nzhQputNHrIH16sggCAznwqCOWtsLr~CGuUZtZYKN6V0sYTELKIjsbp0bTF5-qwwnWTDyTjNGWquUlf8hvcSkzTFdSCf6M5rfpNVAoWJTOyyl3OuWhTNQ1MOdrGCaRumuNm9w5CAKWws6LAnXVLTXM2fn~pNJV8-PPXsQwTgkfc62VDdTnY3efDjTG1iw__";

const COMPARE_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/D0eebaAmMDu8mMPNeWB9fh/sandbox/jnT79cpuXnb0r53R856YPM-img-3_1771357248000_na1fn_Y29tcGFyaXNvbi1kZW1v.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvRDBlZWJhQW1NRHU4bU1QTmVXQjlmaC9zYW5kYm94L2puVDc5Y3B1WG5iMHI1M1I4NTZZUE0taW1nLTNfMTc3MTM1NzI0ODAwMF9uYTFmbl9ZMjl0Y0dGeWFYTnZiaTFrWlcxdi5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=UJfUtUBIRqQcJx0enfoSLj-HOPrPv-yxvD69E3-CaeHO1TMTqnlxP8WC7uspeLrY54FUtHBfupLZNfUjRovXvXLbxP6rfB7AHtVbI0vLAMwTy77mQLhMX75SUnF6N9FqwIwXcL0od~AIBeDDhn05Ihe~W4p-cYND~TEaW0pM8QhaVJq6NJBpejMS~WxKUV1r~0BoiQDbdn3Hc7j2oQRK2s0bduypgAvjNpbD4-~VvNmob0xUVKaZyBTeYp3pDG10c~445n6~FnWdJHw3TZQNenNy58~CqFmSfRFHgCG3kNtF93ynGAU1oDDsxnkpqEwbDZY~7kQxs8Vat6G7U4XDYw__";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await patientService.getPatients();
        setPatients(data || []);
      } catch (error) {
        console.error("Error fetching patients:", error);
      }
    };
    fetchPatients();
  }, []);
  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={HERO_BG}
          alt=""
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col flex-1 safe-top safe-bottom"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.header variants={itemVariants} className="pt-14 pb-6 px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="relative">
              <Microscope className="w-9 h-9 text-primary" strokeWidth={1.5} />
              <Sparkles className="w-3 h-3 text-primary/60 absolute -top-0.5 -right-1" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Skin<span className="text-primary">Scope</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-light max-w-[280px] mx-auto leading-relaxed">
            Suporte visual clínico para análise dermatológica
          </p>
        </motion.header>

        {/* Tool Cards */}
        <div className="flex-1 flex flex-col justify-center gap-5 px-5 pb-8 max-w-lg mx-auto w-full">
          {/* Analysis Tool Card */}
          <motion.div variants={itemVariants}>
            <Link href="/analysis">
              <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_40px_rgba(20,184,166,0.08)] active:scale-[0.98]">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={ANALYSIS_IMG}
                    alt="Análise de Pele"
                    className="w-full h-full object-cover object-top opacity-60 group-hover:opacity-80 transition-all duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                </div>
                <div className="relative px-5 pb-5 -mt-10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-primary/5">
                      <Search className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-1.5">
                        Análise de Pele
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Carregue uma foto e marque áreas de interesse com avaliação por parâmetros: manchas, eritema, rugas, poros e textura.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Compare Tool Card */}
          <motion.div variants={itemVariants}>
            <Link href="/compare">
              <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_40px_rgba(20,184,166,0.08)] active:scale-[0.98]">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={COMPARE_IMG}
                    alt="Comparação Antes e Depois"
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                </div>
                <div className="relative px-5 pb-5 -mt-10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-primary/5">
                      <GitCompareArrows className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-1.5">
                        Antes & Depois
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Compare duas fotos com slider interativo para demonstrar a evolução do tratamento ao paciente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Recent Patients Section */}
        <div className="px-6 pb-8 max-w-lg mx-auto w-full">
          <motion.div variants={itemVariants} className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Pacientes Recentes</h3>
            {/* Future: Add 'See All' or 'New Patient' button here */}
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            {patients.length === 0 ? (
              <div className="text-center py-8 rounded-2xl border border-dashed border-border/50 bg-card/30">
                <p className="text-sm text-muted-foreground">Nenhum paciente registrado ainda.</p>
              </div>
            ) : (
              patients.slice(0, 5).map((patient) => (
                <div
                  key={patient.id}
                  className="group flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{patient.name}</h4>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(patient.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          variants={itemVariants}
          className="text-center pb-6 px-6"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/40 font-light">
            <div className="w-1 h-1 rounded-full bg-primary/40" />
            <span>Uso clínico pessoal</span>
            <div className="w-1 h-1 rounded-full bg-primary/40" />
          </div>
        </motion.footer>
      </motion.div>
    </div>
  );
}
