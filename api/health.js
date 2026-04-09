/**
 * Health check endpoint
 * Used to verify the app is running
 */
module.exports = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Transcorp SuiteFleet Integration is running',
  });
};
