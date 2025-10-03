self.onmessage = (e) => {
  const { text } = e.data || {};
  try {
    const data = JSON.parse(text);
    self.postMessage({ ok: true, data });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
