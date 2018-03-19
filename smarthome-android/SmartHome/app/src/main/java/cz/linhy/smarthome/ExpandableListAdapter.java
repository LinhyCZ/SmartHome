package cz.linhy.smarthome;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseExpandableListAdapter;
import android.widget.TextView;

public class ExpandableListAdapter extends BaseExpandableListAdapter{
    private MainMenu _context;
    private List<Boolean> _Status;
    private List<String> _listDataHeader; // header titles
    private List<String> _IDs;
    // child data in format of header title, child title
    private HashMap<String, List<String>> _listDataChild;

    public ExpandableListAdapter(MainMenu context, List<String> listDataHeader, List<String> IDs, List<Boolean> status,
                              HashMap<String, List<String>> listChildData) {
        this._context = context;
        listDataHeader.add(0, "Hlavní strana");
        this._listDataHeader = listDataHeader;
        IDs.add(0, "0");
        this._IDs = IDs;
        status.add(false);
        this._Status = status;
        listChildData.put("Hlavní strana", new ArrayList<String>());
        this._listDataChild = listChildData;
    }

    @Override
    public Object getChild(int groupPosition, int childPosititon) {
        return this._listDataChild.get(this._listDataHeader.get(groupPosition))
                .get(childPosititon);
    }

    @Override
    public long getChildId(int groupPosition, int childPosition) {
        return childPosition;
    }

    @Override
    public View getChildView(int groupPosition, final int childPosition,
                             boolean isLastChild, View convertView, ViewGroup parent) {

        final String childText = (String) getChild(groupPosition, childPosition);
        String deviceID = (String) getDeviceId(groupPosition);

        if (convertView == null) {
            LayoutInflater infalInflater = (LayoutInflater) this._context
                    .getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            convertView = infalInflater.inflate(R.layout.list_item, null);
        }

        TextView txtListChild = (TextView) convertView
                .findViewById(R.id.labelListItem);

        txtListChild.setText(childText);
        txtListChild.setTag(R.id.deviceID, deviceID);
        return convertView;
    }

    @Override
    public int getChildrenCount(int groupPosition) {
        return this._listDataChild.get(this._listDataHeader.get(groupPosition))
                .size();
    }

    @Override
    public Object getGroup(int groupPosition) {
        return this._listDataHeader.get(groupPosition);
    }

    public Object getDeviceId(int groupPosition) { return this._IDs.get(groupPosition); }

    public Boolean getDeviceStatus(int groupPosition) { return this._Status.get(groupPosition); }

    @Override
    public int getGroupCount() {
        return this._listDataHeader.size();
    }

    @Override
    public long getGroupId(int groupPosition) {
        return groupPosition;
    }

    @Override
    public View getGroupView(int groupPosition, boolean isExpanded,
                             View convertView, ViewGroup parent) {
        String headerTitle = (String) getGroup(groupPosition);
        if (convertView == null) {
            LayoutInflater infalInflater = (LayoutInflater) this._context
                    .getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            convertView = infalInflater.inflate(R.layout.list_group, null);
        }

        convertView.findViewById(R.id.ListGroupLayout).setTag(getDeviceId(groupPosition));
        TextView lblDeviceStatus = (TextView) convertView.findViewById(R.id.labelDeviceStatus);
        if (!getDeviceId(groupPosition).equals("0")) {
            if(getDeviceStatus(groupPosition)) {
                lblDeviceStatus.setBackground(_context.getDrawable(R.drawable.online_icon));
            } else {
                lblDeviceStatus.setBackground(_context.getDrawable(R.drawable.offline_icon));
            }
        } else {
            convertView.findViewById(R.id.ListGroupLayout).setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    MainMenu.onMenuListClick(v, _context);
                }
            });
            lblDeviceStatus.setBackgroundColor(Color.BLACK);
        }

        TextView lblListHeader = (TextView) convertView
                .findViewById(R.id.labelListHeader);
        lblListHeader.setTypeface(null, Typeface.BOLD);
        lblListHeader.setText(headerTitle);

        return convertView;
    }

    @Override
    public boolean hasStableIds() {
        return false;
    }

    @Override
    public boolean isChildSelectable(int groupPosition, int childPosition) {
        return true;
    }
}
