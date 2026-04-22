const MOCK_USERS = [
  { id: "u1", label: "Ada Lovelace" },
  { id: "u2", label: "Alan Turing" },
  { id: "u3", label: "Grace Hopper" },
  { id: "u4", label: "Margaret Hamilton" },
  { id: "u5", label: "Edsger Dijkstra" },
  { id: "u6", label: "Barbara Liskov" }
];
const dataSources = {
  categories: ["Spot Awards", "Peer Recognition", "Long Service", "Innovation"],
  user_attributes: ["department", "grade", "location", "manager_id", "tenure_months"],
  user_profile_attributes: ["job_title", "business_unit", "cost_center", "joining_date"],
  users: async (query) => {
    const q = query.trim().toLowerCase();
    await new Promise((r) => setTimeout(r, 120));
    if (!q) return MOCK_USERS.slice(0, 4);
    return MOCK_USERS.filter(
      (u) => u.label.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    );
  }
};
export {
  dataSources
};
