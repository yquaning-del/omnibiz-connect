import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ar' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  languages: { code: Language; name: string; nativeName: string; dir: 'ltr' | 'rtl' }[];
}

const languages: LanguageContextType['languages'] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
];

// Translation strings
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.pos': 'Point of Sale',
    'nav.orders': 'Orders',
    'nav.products': 'Products',
    'nav.inventory': 'Inventory',
    'nav.customers': 'Customers',
    'nav.staff': 'Staff',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.tables': 'Tables',
    'nav.kitchen': 'Kitchen Display',
    'nav.reservations': 'Reservations',
    'nav.rooms': 'Rooms',
    'nav.housekeeping': 'Housekeeping',
    'nav.pharmacy': 'Pharmacy',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your organization, locations, and preferences',
    'settings.organization': 'Organization',
    'settings.location': 'Location',
    'settings.profile': 'Profile',
    'settings.notifications': 'Notifications',
    'settings.language': 'Language',
    'settings.language.title': 'Language Settings',
    'settings.language.subtitle': 'Choose your preferred language',
    'settings.language.select': 'Select Language',
    'settings.language.current': 'Current Language',
    'settings.save': 'Save Changes',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back',
    'dashboard.todaySales': "Today's Sales",
    'dashboard.totalOrders': 'Total Orders',
    'dashboard.avgOrder': 'Avg Order Value',
    'dashboard.activeItems': 'Active Items',
    
    // Auth
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.signout': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
  },
  es: {
    // Navigation
    'nav.dashboard': 'Panel',
    'nav.pos': 'Punto de Venta',
    'nav.orders': 'Pedidos',
    'nav.products': 'Productos',
    'nav.inventory': 'Inventario',
    'nav.customers': 'Clientes',
    'nav.staff': 'Personal',
    'nav.reports': 'Informes',
    'nav.settings': 'Configuración',
    'nav.tables': 'Mesas',
    'nav.kitchen': 'Pantalla Cocina',
    'nav.reservations': 'Reservas',
    'nav.rooms': 'Habitaciones',
    'nav.housekeeping': 'Limpieza',
    'nav.pharmacy': 'Farmacia',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.subtitle': 'Administra tu organización, ubicaciones y preferencias',
    'settings.organization': 'Organización',
    'settings.location': 'Ubicación',
    'settings.profile': 'Perfil',
    'settings.notifications': 'Notificaciones',
    'settings.language': 'Idioma',
    'settings.language.title': 'Configuración de Idioma',
    'settings.language.subtitle': 'Elige tu idioma preferido',
    'settings.language.select': 'Seleccionar Idioma',
    'settings.language.current': 'Idioma Actual',
    'settings.save': 'Guardar Cambios',
    
    // Common
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Agregar',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    
    // Dashboard
    'dashboard.title': 'Panel',
    'dashboard.welcome': 'Bienvenido',
    'dashboard.todaySales': 'Ventas de Hoy',
    'dashboard.totalOrders': 'Total de Pedidos',
    'dashboard.avgOrder': 'Valor Promedio',
    'dashboard.activeItems': 'Items Activos',
    
    // Auth
    'auth.signin': 'Iniciar Sesión',
    'auth.signup': 'Registrarse',
    'auth.signout': 'Cerrar Sesión',
    'auth.email': 'Correo',
    'auth.password': 'Contraseña',
    'auth.fullName': 'Nombre Completo',
  },
  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.pos': 'Point de Vente',
    'nav.orders': 'Commandes',
    'nav.products': 'Produits',
    'nav.inventory': 'Inventaire',
    'nav.customers': 'Clients',
    'nav.staff': 'Personnel',
    'nav.reports': 'Rapports',
    'nav.settings': 'Paramètres',
    'nav.tables': 'Tables',
    'nav.kitchen': 'Écran Cuisine',
    'nav.reservations': 'Réservations',
    'nav.rooms': 'Chambres',
    'nav.housekeeping': 'Entretien',
    'nav.pharmacy': 'Pharmacie',
    
    // Settings
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Gérez votre organisation, emplacements et préférences',
    'settings.organization': 'Organisation',
    'settings.location': 'Emplacement',
    'settings.profile': 'Profil',
    'settings.notifications': 'Notifications',
    'settings.language': 'Langue',
    'settings.language.title': 'Paramètres de Langue',
    'settings.language.subtitle': 'Choisissez votre langue préférée',
    'settings.language.select': 'Sélectionner la Langue',
    'settings.language.current': 'Langue Actuelle',
    'settings.save': 'Enregistrer',
    
    // Common
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.export': 'Exporter',
    'common.import': 'Importer',
    
    // Dashboard
    'dashboard.title': 'Tableau de bord',
    'dashboard.welcome': 'Bienvenue',
    'dashboard.todaySales': "Ventes d'Aujourd'hui",
    'dashboard.totalOrders': 'Total Commandes',
    'dashboard.avgOrder': 'Valeur Moyenne',
    'dashboard.activeItems': 'Articles Actifs',
    
    // Auth
    'auth.signin': 'Connexion',
    'auth.signup': "S'inscrire",
    'auth.signout': 'Déconnexion',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.fullName': 'Nom Complet',
  },
  de: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.pos': 'Verkaufspunkt',
    'nav.orders': 'Bestellungen',
    'nav.products': 'Produkte',
    'nav.inventory': 'Inventar',
    'nav.customers': 'Kunden',
    'nav.staff': 'Personal',
    'nav.reports': 'Berichte',
    'nav.settings': 'Einstellungen',
    'nav.tables': 'Tische',
    'nav.kitchen': 'Küchenanzeige',
    'nav.reservations': 'Reservierungen',
    'nav.rooms': 'Zimmer',
    'nav.housekeeping': 'Housekeeping',
    'nav.pharmacy': 'Apotheke',
    
    // Settings
    'settings.title': 'Einstellungen',
    'settings.subtitle': 'Verwalten Sie Ihre Organisation, Standorte und Präferenzen',
    'settings.organization': 'Organisation',
    'settings.location': 'Standort',
    'settings.profile': 'Profil',
    'settings.notifications': 'Benachrichtigungen',
    'settings.language': 'Sprache',
    'settings.language.title': 'Spracheinstellungen',
    'settings.language.subtitle': 'Wählen Sie Ihre bevorzugte Sprache',
    'settings.language.select': 'Sprache Auswählen',
    'settings.language.current': 'Aktuelle Sprache',
    'settings.save': 'Änderungen Speichern',
    
    // Common
    'common.loading': 'Laden...',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.add': 'Hinzufügen',
    'common.search': 'Suchen',
    'common.filter': 'Filtern',
    'common.export': 'Exportieren',
    'common.import': 'Importieren',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Willkommen zurück',
    'dashboard.todaySales': 'Heutige Verkäufe',
    'dashboard.totalOrders': 'Gesamtbestellungen',
    'dashboard.avgOrder': 'Durchschnittswert',
    'dashboard.activeItems': 'Aktive Artikel',
    
    // Auth
    'auth.signin': 'Anmelden',
    'auth.signup': 'Registrieren',
    'auth.signout': 'Abmelden',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.fullName': 'Vollständiger Name',
  },
  pt: {
    // Navigation
    'nav.dashboard': 'Painel',
    'nav.pos': 'Ponto de Venda',
    'nav.orders': 'Pedidos',
    'nav.products': 'Produtos',
    'nav.inventory': 'Estoque',
    'nav.customers': 'Clientes',
    'nav.staff': 'Funcionários',
    'nav.reports': 'Relatórios',
    'nav.settings': 'Configurações',
    'nav.tables': 'Mesas',
    'nav.kitchen': 'Tela da Cozinha',
    'nav.reservations': 'Reservas',
    'nav.rooms': 'Quartos',
    'nav.housekeeping': 'Limpeza',
    'nav.pharmacy': 'Farmácia',
    
    // Settings
    'settings.title': 'Configurações',
    'settings.subtitle': 'Gerencie sua organização, locais e preferências',
    'settings.organization': 'Organização',
    'settings.location': 'Local',
    'settings.profile': 'Perfil',
    'settings.notifications': 'Notificações',
    'settings.language': 'Idioma',
    'settings.language.title': 'Configurações de Idioma',
    'settings.language.subtitle': 'Escolha seu idioma preferido',
    'settings.language.select': 'Selecionar Idioma',
    'settings.language.current': 'Idioma Atual',
    'settings.save': 'Salvar Alterações',
    
    // Common
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.add': 'Adicionar',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    
    // Dashboard
    'dashboard.title': 'Painel',
    'dashboard.welcome': 'Bem-vindo',
    'dashboard.todaySales': 'Vendas de Hoje',
    'dashboard.totalOrders': 'Total de Pedidos',
    'dashboard.avgOrder': 'Valor Médio',
    'dashboard.activeItems': 'Itens Ativos',
    
    // Auth
    'auth.signin': 'Entrar',
    'auth.signup': 'Cadastrar',
    'auth.signout': 'Sair',
    'auth.email': 'E-mail',
    'auth.password': 'Senha',
    'auth.fullName': 'Nome Completo',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.pos': 'نقطة البيع',
    'nav.orders': 'الطلبات',
    'nav.products': 'المنتجات',
    'nav.inventory': 'المخزون',
    'nav.customers': 'العملاء',
    'nav.staff': 'الموظفين',
    'nav.reports': 'التقارير',
    'nav.settings': 'الإعدادات',
    'nav.tables': 'الطاولات',
    'nav.kitchen': 'شاشة المطبخ',
    'nav.reservations': 'الحجوزات',
    'nav.rooms': 'الغرف',
    'nav.housekeeping': 'التدبير المنزلي',
    'nav.pharmacy': 'الصيدلية',
    
    // Settings
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'إدارة مؤسستك ومواقعك وتفضيلاتك',
    'settings.organization': 'المؤسسة',
    'settings.location': 'الموقع',
    'settings.profile': 'الملف الشخصي',
    'settings.notifications': 'الإشعارات',
    'settings.language': 'اللغة',
    'settings.language.title': 'إعدادات اللغة',
    'settings.language.subtitle': 'اختر لغتك المفضلة',
    'settings.language.select': 'اختر اللغة',
    'settings.language.current': 'اللغة الحالية',
    'settings.save': 'حفظ التغييرات',
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.welcome': 'مرحباً بعودتك',
    'dashboard.todaySales': 'مبيعات اليوم',
    'dashboard.totalOrders': 'إجمالي الطلبات',
    'dashboard.avgOrder': 'متوسط القيمة',
    'dashboard.activeItems': 'العناصر النشطة',
    
    // Auth
    'auth.signin': 'تسجيل الدخول',
    'auth.signup': 'إنشاء حساب',
    'auth.signout': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.fullName': 'الاسم الكامل',
  },
  zh: {
    // Navigation
    'nav.dashboard': '仪表板',
    'nav.pos': '销售点',
    'nav.orders': '订单',
    'nav.products': '产品',
    'nav.inventory': '库存',
    'nav.customers': '客户',
    'nav.staff': '员工',
    'nav.reports': '报告',
    'nav.settings': '设置',
    'nav.tables': '餐桌',
    'nav.kitchen': '厨房显示',
    'nav.reservations': '预订',
    'nav.rooms': '房间',
    'nav.housekeeping': '客房服务',
    'nav.pharmacy': '药房',
    
    // Settings
    'settings.title': '设置',
    'settings.subtitle': '管理您的组织、位置和偏好',
    'settings.organization': '组织',
    'settings.location': '位置',
    'settings.profile': '个人资料',
    'settings.notifications': '通知',
    'settings.language': '语言',
    'settings.language.title': '语言设置',
    'settings.language.subtitle': '选择您的首选语言',
    'settings.language.select': '选择语言',
    'settings.language.current': '当前语言',
    'settings.save': '保存更改',
    
    // Common
    'common.loading': '加载中...',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.add': '添加',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.export': '导出',
    'common.import': '导入',
    
    // Dashboard
    'dashboard.title': '仪表板',
    'dashboard.welcome': '欢迎回来',
    'dashboard.todaySales': '今日销售',
    'dashboard.totalOrders': '总订单',
    'dashboard.avgOrder': '平均订单值',
    'dashboard.activeItems': '活跃项目',
    
    // Auth
    'auth.signin': '登录',
    'auth.signup': '注册',
    'auth.signout': '退出',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'auth.fullName': '全名',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    // Set document direction for RTL languages
    const langConfig = languages.find(l => l.code === language);
    document.documentElement.dir = langConfig?.dir || 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]);

  const contextValue = useMemo(() => ({
    language, setLanguage, t, languages
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
