/* ============================================================
   Landing — 落地页组装（从 homedemo/app.jsx 1:1 移植）
   顺序：Navbar → Hero → Features → Pipeline → Scenarios
        → ReportPreview → CTA → Footer

   功能对接（在保真 UI 上的接线）：
     onLoginClick   —— 「登录」按钮 → 弹登录框（正常流程入口）
     onFreeTrial    —— 「免费体验 / 立即免费体验」→ 离线演示流程
     onStartAnalyze —— Hero「开始分析」→ 正常流程（已登录直进工作台，否则弹登录框）
   ============================================================ */

import Navbar from './Navbar.jsx'
import Hero from './Hero.jsx'
import Features from './Features.jsx'
import Pipeline from './Pipeline.jsx'
import Scenarios from './Scenarios.jsx'
import ReportPreview from './ReportPreview.jsx'
import CTA from './CTA.jsx'
import Footer from './Footer.jsx'
import './landing.css'

export default function Landing({ user, onLoginClick, onFreeTrial, onStartAnalyze, onDemo, onEnterWorkspace }) {
  return (
    <div className="landing-page">
      <Navbar
        user={user}
        onLoginClick={onLoginClick}
        onDemo={onDemo}
        onEnterWorkspace={onEnterWorkspace}
      />
      <main>
        <Hero onStartAnalyze={onStartAnalyze} />
        <Features />
        <Pipeline />
        <Scenarios />
        <ReportPreview />
        <CTA onFreeTrial={onFreeTrial} />
      </main>
      <Footer />
    </div>
  )
}
