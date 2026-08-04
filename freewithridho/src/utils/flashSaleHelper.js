/**
 * Checks if a project is currently in an active Flash Sale.
 * It checks the `isFlashSale` flag and the start/end date constraints.
 * 
 * @param {Object} project - The project document
 * @returns {boolean} True if flash sale is currently active, false otherwise
 */
export const isFlashSaleActive = (project) => {
  if (!project || !project.isFlashSale) return false;

  const now = new Date();

  if (project.flashSaleStartDate) {
    const startDate = new Date(project.flashSaleStartDate);
    if (now < startDate) return false; // Belum mulai
  }

  if (project.flashSaleEndDate) {
    const endDate = new Date(project.flashSaleEndDate);
    if (now > endDate) return false; // Sudah lewat
  }

  return true;
};

/**
 * Returns the correct current price of a project.
 * If flash sale is active, returns discountPrice. Otherwise, returns normal price.
 * 
 * @param {Object} project - The project document
 * @returns {number} The current price
 */
export const getProjectPrice = (project) => {
  if (!project) return 0;
  
  if (isFlashSaleActive(project) && project.discountPrice > 0) {
    return Number(project.discountPrice);
  }
  
  return Number(project.price) || 0;
};
