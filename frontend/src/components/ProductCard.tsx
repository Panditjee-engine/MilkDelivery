import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CategoryColors } from '../constants/colors';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  unit: string;
  image?: string;
  is_available: boolean;
}

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onSubscribe?: () => void;
}

export default function ProductCard({ product, onPress, onSubscribe }: ProductCardProps) {
  const categoryColor = CategoryColors[product.category] || Colors.surfaceSecondary;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.imageContainer, { backgroundColor: categoryColor }]}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name={getCategoryIcon(product.category)}
            size={40}
            color={Colors.textSecondary}
          />
        )}
        {!product.is_available && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>Out of Stock</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.unit}>{product.unit}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>₹{product.price}</Text>
          {onSubscribe && product.is_available && (
            <TouchableOpacity style={styles.subscribeButton} onPress={onSubscribe}>
              <Ionicons name="add" size={20} color={Colors.textInverse} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}



function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'milk': return 'water';
    case 'dairy': return 'ice-cream';
    case 'bakery': return 'pizza';
    case 'fruits': return 'nutrition';
    case 'vegetables': return 'leaf';
    case 'essentials': return 'basket';
    default: return 'cube';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    width: '48%',
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  unavailableBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unavailableText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  unit: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  subscribeButton: {
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
