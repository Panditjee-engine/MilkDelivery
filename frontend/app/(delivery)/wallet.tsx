import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  GestureResponderEvent,
} from 'react-native';
import {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// ─── Color palette ───────────────────────────────────────────────
const C = {
  primary: '#f59e84',
  primaryDark: '#e8845f',
  primaryDeep: '#d4693f',
  primaryLight: '#fde8df',
  primaryXLight: '#fff5f1',
  withdraw: '#f97c54',
  withdrawDark: '#e8502a',
  addBank: '#f5b78e',
  addBankDark: '#f08050',
  myBanks: '#e87c5a',
  myBanksDark: '#c9552e',
  white: '#ffffff',
  text: '#2c2c2a',
  textMuted: '#888',
  textLight: '#aaa',
  success: '#3b6d11',
  danger: '#a32d2d',
} as const;

// ─── Types ────────────────────────────────────────────────────────
interface Bank {
  id: number;
  name: string;
  holder: string;
  acc: string;
  ifsc: string;
  type: string;
}

interface ActionItem {
  label: string;
  icon: string;
  bg: [string, string];
  onPress: () => void;
}

interface AnimatedTouchableProps {
  onPress?: (e?: GestureResponderEvent) => void;
  style?: object | object[];
  children: React.ReactNode;
}

interface FormInputProps {
  label: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
}

interface SubHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  balance?: number;
}

interface BankCardProps {
  bank: Bank;
  showActions: boolean;
  onEdit?: (bank: Bank) => void;
  onDelete?: (id: number) => void;
}

interface WalletHomeScreenProps {
  balance: number;
  banks: Bank[];
  onWithdraw: () => void;
  onAddBank: () => void;
  onMyBanks: () => void;
}

interface WithdrawScreenProps {
  balance: number;
  banks: Bank[];
  onBack: () => void;
  onWithdraw: (amount: number) => void;
}

interface AddBankScreenProps {
  onBack: () => void;
  onAdd: (bank: Bank) => void;
}

interface BankListScreenProps {
  banks: Bank[];
  onBack: () => void;
  onAddBank: () => void;
  onEdit: (bank: Bank) => void;
  onDelete: (id: number) => void;
}

interface EditBankModalProps {
  visible: boolean;
  bank: Bank | null;
  onClose: () => void;
  onSave: (updates: Partial<Bank>) => void;
}

// ─── Constants ───────────────────────────────────────────────────
const INITIAL_BANKS: Bank[] = [
  { id: 1, name: 'HDFC Bank', holder: 'Ravi Kumar', acc: 'XXXX8234', ifsc: 'HDFC0001234', type: 'Savings account' },
  { id: 2, name: 'State Bank of India', holder: 'Ravi Kumar', acc: 'XXXX5671', ifsc: 'SBIN0001234', type: 'Savings account' },
];

const BANK_LIST: string[] = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
  'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank', 'Yes Bank',
];

const BANK_ICONS: Record<string, string> = {
  'State Bank of India': '🏛', 'HDFC Bank': '🔵', 'ICICI Bank': '🟠',
  'Axis Bank': '🟣', 'Kotak Mahindra Bank': '🔴', 'Punjab National Bank': '🟡',
  'Bank of Baroda': '🟤', 'Canara Bank': '🟢', 'Union Bank': '⚪', 'Yes Bank': '🔶',
};

const SCREENS = {
  home: 'home',
  withdraw: 'withdraw',
  addBank: 'addBank',
  bankList: 'bankList',
} as const;

type ScreenName = typeof SCREENS[keyof typeof SCREENS];

// ─── AnimatedTouchable ────────────────────────────────────────────
const AnimatedTouchable: React.FC<AnimatedTouchableProps> = ({ onPress, style, children }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };
  return (
    <TouchableOpacity onPress={press} activeOpacity={0.85}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// ─── FormInput ────────────────────────────────────────────────────
const FormInput: React.FC<FormInputProps> = ({ label, ...props }) => (
  <View style={styles.formGroup}>
    <Text style={styles.formLabel}>{label}</Text>
    <TextInput style={styles.formInput} placeholderTextColor={C.textLight} {...props} />
  </View>
);

// ─── SubHeader — insets handled internally ────────────────────────
const SubHeader: React.FC<SubHeaderProps> = ({ title, subtitle, onBack, balance }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubCenter}>{subtitle}</Text> : null}
      {balance !== undefined && (
        <>
          <Text style={[styles.balanceLabel, { marginTop: 8 }]}>Available balance</Text>
          <Text style={styles.balanceAmount}>
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </>
      )}
    </View>
  );
};

// ─── BankCard ─────────────────────────────────────────────────────
const BankCard: React.FC<BankCardProps> = ({ bank, showActions, onEdit, onDelete }) => (
  <View style={styles.bankCard}>
    <View style={styles.bankIconWrap}>
      <Text style={{ fontSize: 20 }}>{BANK_ICONS[bank.name] ?? '🏦'}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.bankName}>{bank.name}</Text>
      <Text style={styles.bankAcc}>
        {bank.holder} · {bank.acc}{showActions ? ` · ${bank.type}` : ''}
      </Text>
    </View>
    {showActions && (
      <View style={styles.bankActions}>
        <TouchableOpacity style={[styles.iconBtn, styles.editBtn]} onPress={() => onEdit?.(bank)}>
          <Text style={{ fontSize: 14 }}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn, styles.deleteBtn]} onPress={() => onDelete?.(bank.id)}>
          <Text style={{ fontSize: 14 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

// ─── WalletHomeScreen ─────────────────────────────────────────────
const WalletHomeScreen: React.FC<WalletHomeScreenProps> = ({
  balance, banks, onWithdraw, onAddBank, onMyBanks,
}) => {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const actions: ActionItem[] = [
    { label: 'Withdraw', icon: '↑', bg: [C.withdraw, C.withdrawDark], onPress: onWithdraw },
    { label: 'Add bank', icon: '＋', bg: [C.addBank, C.addBankDark], onPress: onAddBank },
    { label: 'My banks', icon: '🏦', bg: [C.myBanks, C.myBanksDark], onPress: onMyBanks },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.primaryXLight }}
      // bottom inset so content is never hidden behind home indicator
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* top inset baked into header so coral fills right up to the status bar */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerEyebrow}>My wallet</Text>
        <Text style={styles.balanceLabel}>Total balance</Text>
        <Animated.Text style={[styles.balanceAmount, { transform: [{ scale: pulseAnim }] }]}>
          ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Animated.Text>
        <Text style={styles.headerSub}>Updated just now</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TODAY'S EARNING</Text>
          <Text style={styles.statValue}>₹620</Text>
          <Text style={styles.statChange}>↑ 12% vs yesterday</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>THIS WEEK</Text>
          <Text style={styles.statValue}>₹3,240</Text>
          <Text style={styles.statChange}>↑ 8% vs last week</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {actions.map((a) => (
          <AnimatedTouchable
            key={a.label}
            onPress={a.onPress}
            style={[styles.actionBtn, { backgroundColor: a.bg[0] }]}
          >
            <View style={styles.actionIconWrap}>
              <Text style={{ fontSize: 20 }}>{a.icon}</Text>
            </View>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </AnimatedTouchable>
        ))}
      </View>

      {/* Linked accounts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Linked accounts</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{banks.length}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onMyBanks}>
            <Text style={styles.seeAll}>View all →</Text>
          </TouchableOpacity>
        </View>
        {banks.length === 0
          ? <Text style={styles.emptyText}>No banks linked yet</Text>
          : banks.map((b) => <BankCard key={b.id} bank={b} showActions={false} />)
        }
      </View>
    </ScrollView>
  );
};

// ─── WithdrawScreen ───────────────────────────────────────────────
const WithdrawScreen: React.FC<WithdrawScreenProps> = ({ balance, banks, onBack, onWithdraw }) => {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<number | null>(banks[0]?.id ?? null);
  const [bankPickerVisible, setBankPickerVisible] = useState<boolean>(false);
  const selected = banks.find((b) => b.id === selectedBank);

  const handleWithdraw = (): void => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (amt > balance) { Alert.alert('Error', 'Insufficient balance'); return; }
    if (!selectedBank) { Alert.alert('Error', 'Please select a bank account'); return; }
    onWithdraw(amt);
    setAmount('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.primaryXLight }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <SubHeader title="Withdraw earnings" onBack={onBack} balance={balance} />
        <View style={styles.formSection}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Withdraw amount</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter amount (₹)"
              placeholderTextColor={C.textLight}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Select bank account</Text>
            <TouchableOpacity style={styles.formInput} onPress={() => setBankPickerVisible(true)}>
              <Text style={{ color: selected ? C.text : C.textLight, fontSize: 14 }}>
                {selected ? `${selected.name} · ${selected.acc}` : 'Select a bank'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Processing fee</Text>
              <Text style={styles.infoVal}>₹0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Transfer time</Text>
              <Text style={[styles.infoVal, { color: C.success }]}>Instant</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* paddingBottom = home indicator height so button never hides behind it */}
      <View style={[styles.bottomBtn, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleWithdraw}>
          <Text style={styles.primaryBtnText}>Withdraw now</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={bankPickerVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select bank account</Text>
            {banks.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.bankCard, { marginBottom: 8 }]}
                onPress={() => { setSelectedBank(b.id); setBankPickerVisible(false); }}
              >
                <View style={styles.bankIconWrap}>
                  <Text style={{ fontSize: 20 }}>{BANK_ICONS[b.name] ?? '🏦'}</Text>
                </View>
                <View>
                  <Text style={styles.bankName}>{b.name}</Text>
                  <Text style={styles.bankAcc}>{b.acc}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setBankPickerVisible(false)} style={[styles.primaryBtn, { marginTop: 8 }]}>
              <Text style={styles.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ─── AddBankScreen ────────────────────────────────────────────────
const AddBankScreen: React.FC<AddBankScreenProps> = ({ onBack, onAdd }) => {
  const insets = useSafeAreaInsets();
  const [bankName, setBankName] = useState<string>('');
  const [holder, setHolder] = useState<string>('');
  const [acc, setAcc] = useState<string>('');
  const [accConfirm, setAccConfirm] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');
  const [accType, setAccType] = useState<string>('');
  const [bankPickerVisible, setBankPickerVisible] = useState<boolean>(false);
  const [typePickerVisible, setTypePickerVisible] = useState<boolean>(false);

  const handleAdd = (): void => {
    if (!bankName || !holder || !acc || !ifsc || !accType) {
      Alert.alert('Error', 'Please fill all fields'); return;
    }
    if (acc !== accConfirm) {
      Alert.alert('Error', 'Account numbers do not match'); return;
    }
    onAdd({
      id: Date.now(),
      name: bankName,
      holder,
      acc: 'XXXX' + acc.slice(-4),
      ifsc: ifsc.toUpperCase(),
      type: accType,
    });
    setBankName(''); setHolder(''); setAcc('');
    setAccConfirm(''); setIfsc(''); setAccType('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: C.primaryXLight }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <SubHeader title="Add bank account" subtitle="Your details are encrypted & secure" onBack={onBack} />
        <View style={styles.formSection}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Bank name</Text>
            <TouchableOpacity style={styles.formInput} onPress={() => setBankPickerVisible(true)}>
              <Text style={{ color: bankName ? C.text : C.textLight, fontSize: 14 }}>
                {bankName || 'Select your bank'}
              </Text>
            </TouchableOpacity>
          </View>
          <FormInput label="Account holder name" placeholder="As per bank records" value={holder} onChangeText={setHolder} />
          <FormInput label="Account number" placeholder="Enter account number" keyboardType="numeric" value={acc} onChangeText={setAcc} secureTextEntry />
          <FormInput label="Confirm account number" placeholder="Re-enter account number" keyboardType="numeric" value={accConfirm} onChangeText={setAccConfirm} secureTextEntry />
          <FormInput label="IFSC code" placeholder="e.g. SBIN0001234" value={ifsc} onChangeText={(t) => setIfsc(t.toUpperCase())} autoCapitalize="characters" />
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Account type</Text>
            <TouchableOpacity style={styles.formInput} onPress={() => setTypePickerVisible(true)}>
              <Text style={{ color: accType ? C.text : C.textLight, fontSize: 14 }}>
                {accType || 'Select type'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBtn, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleAdd}>
          <Text style={styles.primaryBtnText}>+ Add bank account</Text>
        </TouchableOpacity>
      </View>

      {/* Bank name picker */}
      <Modal visible={bankPickerVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select your bank</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {BANK_LIST.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={styles.pickerItem}
                  onPress={() => { setBankName(b); setBankPickerVisible(false); }}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>{BANK_ICONS[b] ?? '🏦'}</Text>
                  <Text style={{ fontSize: 14, color: C.text, fontWeight: bankName === b ? '700' : '400' }}>{b}</Text>
                  {bankName === b && <Text style={{ marginLeft: 'auto', color: C.primaryDark }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setBankPickerVisible(false)} style={[styles.primaryBtn, { marginTop: 12 }]}>
              <Text style={styles.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Account type picker */}
      <Modal visible={typePickerVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Account type</Text>
            {['Savings account', 'Current account'].map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.pickerItem}
                onPress={() => { setAccType(t); setTypePickerVisible(false); }}
              >
                <Text style={{ fontSize: 14, color: C.text, fontWeight: accType === t ? '700' : '400' }}>{t}</Text>
                {accType === t && <Text style={{ marginLeft: 'auto', color: C.primaryDark }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setTypePickerVisible(false)} style={[styles.primaryBtn, { marginTop: 12 }]}>
              <Text style={styles.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ─── BankListScreen ───────────────────────────────────────────────
const BankListScreen: React.FC<BankListScreenProps> = ({ banks, onBack, onAddBank, onEdit, onDelete }) => {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.primaryXLight }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
    >
      <SubHeader title="My bank accounts" subtitle="Manage your linked accounts" onBack={onBack} />
      <View style={styles.section}>
        {banks.length === 0
          ? <Text style={styles.emptyText}>No banks linked yet</Text>
          : banks.map((b) => (
            <BankCard key={b.id} bank={b} showActions onEdit={onEdit} onDelete={onDelete} />
          ))
        }
        <TouchableOpacity style={styles.addMoreBtn} onPress={onAddBank}>
          <Text style={{ fontSize: 20, color: C.primaryDark }}>+</Text>
          <Text style={styles.addMoreText}> Add more bank account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ─── EditBankModal ────────────────────────────────────────────────
const EditBankModal: React.FC<EditBankModalProps> = ({ visible, bank, onClose, onSave }) => {
  const insets = useSafeAreaInsets();
  const [holder, setHolder] = useState<string>('');
  const [ifsc, setIfsc] = useState<string>('');

  useEffect(() => {
    if (bank) { setHolder(bank.holder); setIfsc(bank.ifsc); }
  }, [bank]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBg}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit bank account</Text>
            <FormInput label="Account holder name" placeholder="Full name" value={holder} onChangeText={setHolder} />
            <FormInput label="Account number" placeholder="Account number" value={bank?.acc ?? ''} editable={false} />
            <FormInput
              label="IFSC code"
              placeholder="IFSC code"
              value={ifsc}
              onChangeText={(t) => setIfsc(t.toUpperCase())}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={() => onSave({ holder, ifsc: ifsc.toUpperCase() })}>
              <Text style={styles.primaryBtnText}>Save changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: C.primaryLight, marginTop: 10 }]}
              onPress={onClose}
            >
              <Text style={[styles.primaryBtnText, { color: C.primaryDark }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ─── Root ─────────────────────────────────────────────────────────
function WalletRoot(): React.ReactElement {
  const [screen, setScreen] = useState<ScreenName>(SCREENS.home);
  const [banks, setBanks] = useState<Bank[]>(INITIAL_BANKS);
  const [balance, setBalance] = useState<number>(4820.50);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  const goTo = (s: ScreenName): void => setScreen(s);

  const handleWithdraw = (amt: number): void => {
    setBalance((prev) => prev - amt);
    Alert.alert('Success', `₹${amt.toLocaleString('en-IN')} withdrawn successfully!`);
    goTo(SCREENS.home);
  };

  const handleAddBank = (bank: Bank): void => {
    setBanks((prev) => [...prev, bank]);
    Alert.alert('Success', 'Bank account added!');
    goTo(SCREENS.bankList);
  };

  const handleDeleteBank = (id: number): void => {
    Alert.alert('Remove bank', 'Are you sure you want to remove this bank account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setBanks((prev) => prev.filter((b) => b.id !== id)) },
    ]);
  };

  const handleSaveEdit = (updates: Partial<Bank>): void => {
    setBanks((prev) =>
      prev.map((b) => (b.id === editingBank?.id ? { ...b, ...updates } : b))
    );
    setEditingBank(null);
  };

  return (
    /**
     * edges={[]} on SafeAreaView so we handle every inset ourselves.
     * This lets the coral header colour bleed right up into the status-bar
     * area instead of leaving a white gap above it.
     * Each screen reads useSafeAreaInsets() and adds the correct padding.
     */
    <SafeAreaView style={[styles.root, { backgroundColor: C.primary }]} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} translucent />

      {screen === SCREENS.home && (
        <WalletHomeScreen
          balance={balance}
          banks={banks}
          onWithdraw={() => goTo(SCREENS.withdraw)}
          onAddBank={() => goTo(SCREENS.addBank)}
          onMyBanks={() => goTo(SCREENS.bankList)}
        />
      )}
      {screen === SCREENS.withdraw && (
        <WithdrawScreen
          balance={balance}
          banks={banks}
          onBack={() => goTo(SCREENS.home)}
          onWithdraw={handleWithdraw}
        />
      )}
      {screen === SCREENS.addBank && (
        <AddBankScreen onBack={() => goTo(SCREENS.home)} onAdd={handleAddBank} />
      )}
      {screen === SCREENS.bankList && (
        <BankListScreen
          banks={banks}
          onBack={() => goTo(SCREENS.home)}
          onAddBank={() => goTo(SCREENS.addBank)}
          onEdit={setEditingBank}
          onDelete={handleDeleteBank}
        />
      )}

      <EditBankModal
        visible={!!editingBank}
        bank={editingBank}
        onClose={() => setEditingBank(null)}
        onSave={handleSaveEdit}
      />
    </SafeAreaView>
  );
}

/**
 * Exported default — wraps everything in SafeAreaProvider.
 * If your app root already has <SafeAreaProvider>, import WalletRoot directly instead.
 */
export default function WalletScreen(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <WalletRoot />
    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header — paddingTop injected dynamically (insets.top + 12)
  header: {
    backgroundColor: C.primary,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerEyebrow: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 12 },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, letterSpacing: 0.5, marginBottom: 6 },
  balanceAmount: { color: C.white, fontSize: 38, fontWeight: '700', letterSpacing: -1 },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4 },
  headerSubCenter: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4, textAlign: 'center' },
  pageTitle: { color: C.white, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  backBtnText: { color: C.white, fontSize: 18 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, margin: 16, marginBottom: 0 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 16,
    padding: 16, borderWidth: 1.5, borderColor: C.primaryLight,
  },
  statLabel: { fontSize: 10, color: C.textLight, letterSpacing: 0.5, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '700', color: C.primaryDark },
  statChange: { fontSize: 11, color: C.success, marginTop: 4 },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10, margin: 16, marginTop: 16 },
  actionBtn: {
    flex: 1, paddingVertical: 16, paddingHorizontal: 8,
    borderRadius: 18, alignItems: 'center', gap: 8,
  },
  actionIconWrap: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { color: C.white, fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },

  // Section
  section: { margin: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#c86040' },
  seeAll: { fontSize: 12, color: C.primary, fontWeight: '500' },
  badge: {
    backgroundColor: C.primaryLight, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: C.primaryDark },
  emptyText: { textAlign: 'center', color: C.textLight, fontSize: 13, paddingVertical: 16 },

  // Bank card
  bankCard: {
    backgroundColor: C.white, borderRadius: 16, borderWidth: 1.5,
    borderColor: C.primaryLight, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  bankIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  bankName: { fontSize: 14, fontWeight: '600', color: C.text },
  bankAcc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  bankActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  editBtn: { backgroundColor: C.primaryLight },
  deleteBtn: { backgroundColor: '#fce8e8' },

  // Add more
  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.primary, borderStyle: 'dashed',
    borderRadius: 16, backgroundColor: C.primaryXLight,
    paddingVertical: 14, marginTop: 4,
  },
  addMoreText: { color: C.primaryDark, fontSize: 14, fontWeight: '700' },

  // Form
  formSection: { margin: 20 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#c86040', marginBottom: 6 },
  formInput: {
    backgroundColor: C.white, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.primaryLight, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: C.text, justifyContent: 'center',
  },

  // Info card
  infoCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: C.primaryLight, marginTop: 4,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoKey: { fontSize: 13, color: C.textLight },
  infoVal: { fontSize: 13, color: C.text, fontWeight: '500' },

  // Bottom sticky button — paddingBottom injected dynamically
  bottomBtn: {
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: C.primaryXLight,
  },
  primaryBtn: {
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  primaryBtnText: { color: C.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%' as any,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#c86040', marginBottom: 20, textAlign: 'center' },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: C.primaryLight,
  },
});