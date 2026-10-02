import java.util.*;

/** AVL tree keyed by property price. Each node stores all listings at that price. */
public class AVLPriceIndex {
    private static class Node {
        int key;
        int height = 1;
        List<Integer> ids = new ArrayList<>();
        Node left, right;
        Node(int key, int id) { this.key = key; ids.add(id); }
    }

    private Node root;

    private int h(Node n) { return n == null ? 0 : n.height; }
    private int balance(Node n) { return n == null ? 0 : h(n.left) - h(n.right); }
    private void fix(Node n) { n.height = 1 + Math.max(h(n.left), h(n.right)); }

    private Node rotateRight(Node y) {
        Node x = y.left, t = x.right;
        x.right = y; y.left = t;
        fix(y); fix(x); return x;
    }
    private Node rotateLeft(Node x) {
        Node y = x.right, t = y.left;
        y.left = x; x.right = t;
        fix(x); fix(y); return y;
    }

    private Node insert(Node node, int key, int id) {
        if (node == null) return new Node(key, id);
        if (key < node.key) node.left = insert(node.left, key, id);
        else if (key > node.key) node.right = insert(node.right, key, id);
        else { node.ids.add(id); return node; }
        fix(node);
        int b = balance(node);
        if (b > 1 && key < node.left.key) return rotateRight(node);
        if (b < -1 && key > node.right.key) return rotateLeft(node);
        if (b > 1 && key > node.left.key) { node.left = rotateLeft(node.left); return rotateRight(node); }
        if (b < -1 && key < node.right.key) { node.right = rotateRight(node.right); return rotateLeft(node); }
        return node;
    }

    public void insert(int price, int id) { root = insert(root, price, id); }

    public Set<Integer> idsBetween(int minPrice, int maxPrice) {
        Set<Integer> out = new HashSet<>();
        range(root, minPrice, maxPrice, out);
        return out;
    }

    private void range(Node n, int lo, int hi, Set<Integer> out) {
        if (n == null) return;
        if (n.key > lo) range(n.left, lo, hi, out);
        if (n.key >= lo && n.key <= hi) out.addAll(n.ids);
        if (n.key < hi) range(n.right, lo, hi, out);
    }

    public void clear() { root = null; }

    public int height() { return h(root); }
    public int nodeCount() { return countNodes(root); }
    private int countNodes(Node n) { return n == null ? 0 : 1 + countNodes(n.left) + countNodes(n.right); }
}
