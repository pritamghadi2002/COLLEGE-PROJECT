import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, Edit, Trash2, Home, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => `₹${Math.round(price)}`;

export default function AdminPanel() {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    image: "",
    vegType: "veg"
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(`${API}/menu`);
      setMenuItems(res.data);
    } catch (error) {
      console.error("Error fetching menu:", error);
      toast.error("Failed to load menu items");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API}/admin/upload-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setFormData(prev => ({ ...prev, image: `${BACKEND_URL}${res.data.imageUrl}` }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.price || !formData.description) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        image: formData.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop"
      };

      if (editingItem) {
        await axios.put(`${API}/admin/menu/${editingItem.id}`, data);
        toast.success("Item updated successfully");
      } else {
        await axios.post(`${API}/admin/menu`, data);
        toast.success("Item added successfully");
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: "", category: "", price: "", description: "", image: "", vegType: "veg" });
      fetchMenuItems();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Failed to save item");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      description: item.description,
      image: item.image,
      vegType: item.vegType || "veg"
    });
    setShowModal(true);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      await axios.delete(`${API}/admin/menu/${itemId}`);
      toast.success("Item deleted successfully");
      fetchMenuItems();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const categories = [...new Set(menuItems.map(item => item.category))];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold">Admin Panel</h1>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ name: "", category: "", price: "", description: "", image: "", vegType: "veg" });
                  setShowModal(true);
                }}
                className="bg-primary rounded-full"
                data-testid="add-item-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="rounded-full"
                data-testid="admin-home-btn"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {menuItems
                .filter(item => item.category === category)
                .map(item => (
                  <div
                    key={item.id}
                    data-testid={`admin-item-${item.id}`}
                    className="bg-card rounded-xl border border-border p-4"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      <Badge variant={item.availability ? "default" : "destructive"}>
                        {item.availability ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(item.price)}
                      </span>
                      <Badge variant="outline">{item.vegType}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="flex-1 rounded-lg"
                        data-testid={`edit-item-${item.id}-btn`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg"
                        data-testid={`delete-item-${item.id}-btn`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-card rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editingItem ? "Edit Item" : "Add New Item"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Item Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter item name"
                  required
                  data-testid="item-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Pizza, Burgers, Indian"
                  required
                  data-testid="item-category-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price (₹) *</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Enter price"
                  required
                  data-testid="item-price-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <select
                  value={formData.vegType}
                  onChange={(e) => setFormData({ ...formData, vegType: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  data-testid="item-type-select"
                >
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-Veg</option>
                  <option value="starter">Starter</option>
                  <option value="breakfast">Breakfast</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter item description"
                  rows={3}
                  required
                  data-testid="item-description-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Image</label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="flex-1"
                    data-testid="item-image-upload"
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                </div>
                {formData.image && (
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="mt-2 w-32 h-32 object-cover rounded-lg"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-primary rounded-full py-6"
                  data-testid="save-item-btn"
                >
                  {editingItem ? "Update Item" : "Add Item"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="rounded-full"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
