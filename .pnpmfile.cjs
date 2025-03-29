module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "bcrypt" || pkg.name === "sharp") {
        pkg.scripts = pkg.scripts || {};
        pkg.scripts.preinstall = pkg.scripts.preinstall || "";
      }
      return pkg;
    },
  },
};
