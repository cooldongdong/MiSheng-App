import { Component } from 'react';
import PropTypes from 'prop-types';

// **開發用的錯誤顯示層。** React 的 render 一旦丟例外，整棵樹會被卸載——畫面變成
// 全白，而且 console 在手機上看不到。於是「壞掉」與「白字畫在白底上」與「某個分支
// 渲染了 null」三種完全不同的原因，在手機上長得一模一樣。
//
// 這一層把它們分開：真的例外會印出訊息與元件堆疊，其餘什麼都不做。
//
// 只在 dev 掛上（見 main.jsx）。要不要在正式版也留一層「遊戲遇到問題」的畫面，
// 是另一個決定——實境解謎的現場沒有人能救玩家，全白是最糟的失敗方式。
class DevErrorSurface extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: '' };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ stack: info?.componentStack || '' });
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: '#2b0f0f',
          color: '#ffd9d9',
          font: '13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
          padding: 16,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          WebkitUserSelect: 'text',
          userSelect: 'text',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          遊戲在 render 時丟出例外（這一層只有 dev 會出現）
        </div>
        <div style={{ color: '#ff8a80', marginBottom: 12 }}>
          {String(error && (error.stack || error.message || error))}
        </div>
        <div style={{ opacity: 0.75 }}>{stack}</div>
      </div>
    );
  }
}

DevErrorSurface.propTypes = { children: PropTypes.node };

export default DevErrorSurface;
